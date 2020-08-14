import {
    LoggerStructure,
    LogFormatterStructure,
    LogEvent,
    LogLevel,
    LogMessage,
    StackTrace,
    Stream,
    LogProperties,
    BufferStructure
} from "./compiler/types"
import DefaultFormatter from "./DefaultFormatter";
import DeadLogger from "./DeadLogger";
import RequestBuffer from "./RequestBuffer";

// TODO: -convert to Object.prototype structure instead of using a class for perf boost
//       -setup a benchmark to test my logger with Pino and Bunyan   
//       -logger off mode
//       -requestId is forced into unused if defined globally. Fix this
export default class Logger implements LoggerStructure {
    private level: LogLevel;
    private formatter: LogFormatterStructure | undefined;
    private streams: Stream[] | undefined;
    private properties: LogProperties;
    private requestId: string | undefined;
    private logBuffer: BufferStructure | undefined;

    constructor(private name: string = process.env.AWS_LAMBDA_FUNCTION_NAME!, noStdOut?: Boolean) {
        // The following method for disabling the logger works because Lambda
        // performs a cold start whenever env variables are changed.
        if (this.getLevel() === LogLevel.off) {
            this.level = 6;
            this.formatter = undefined;
            this.streams = undefined;
            this.properties = {};
            this.requestId = undefined;
            return new DeadLogger() as unknown as Logger;
        }

        this.level = this.getLevel();
        this.logBuffer = process.env.AWS_REQUEST_ID ? new RequestBuffer() : undefined;
        this.properties = {};
        this.streams = noStdOut ? [] : [{ outputStream: process.stdout, errorStream: process.stderr }];
        this.formatter = new DefaultFormatter();
    }

    //#region public methods
    public trace(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.trace, message, ...args);
    }

    public debug(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.debug, message, ...args);
    }

    public info(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.info, message, ...args);
    }

    public warn(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.warn, message, ...args);
    }

    public error(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.error, message, ...args);
    }

    public fatal(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.fatal, message, ...args);
    }

    public log(level: LogLevel, message: LogMessage, ...args: any[]): void {
        // Make sure we have somewhere to send this message
        if (!this.streams || !this.streams!.length) {
            throw new Error("There were no defined output streams and the default stream set was overridden!");
        }

        // In case the logger was defined globally in a handler file, check for reqId again:
        if (process.env.AWS_REQUEST_ID && !this.logBuffer) {
            this.logBuffer = new RequestBuffer();
        }

        const event = this.packageLogEvent(level, message, ...args);

        // If this is above the level threshold, broadcast the message to a stream
        if (level >= this.level) { this.formatter!.format(event, this.streams) };

        // Save the log event to the buffer (if applicable) after sending the message
        if (this.logBuffer) { this.logBuffer.add(event); }
    }

    public child(properties: object): Logger {
        let name;
        Object.keys(properties).includes("name") ? name = (properties as any).name : name = this.name;

        let child = new Logger(name, true);

        child.formatter = this.formatter;
        child.streams = this.streams;
        child.logBuffer = this.logBuffer;
        child.properties = this.properties;

        for (let [key, value] of Object.entries(properties))
            this.addLogProperty(key, value);

        return this;
    }

    public addLogProperty(key: string, value: any) {
        this.properties[key] = value;
    }

    public removeLogProperty(key: string) {
        delete this.properties[key];
    }

    // TODO: async?
    public attachPropertyScope(key: string, property: string | object, cb: () => any): any {
        this.addLogProperty(key, property);
        let result = cb();
        this.removeLogProperty(key);
        return result;
    }
    //#endregion public methods

    //#region private utility methods
    private getLevel(): LogLevel {
        // Set the log level (default level of 'info')
        if (typeof (process.env.LOG_LEVEL) === "undefined") { return LogLevel.info; }

        let lvl = process.env.LOG_LEVEL.toLowerCase();
        let lvls = ["trace", "debug", "info", "warn", "error", "fatal", 'off'];
        if (!lvls.includes(lvl)) { return LogLevel.info; }

        return LogLevel[`${process.env.LOG_LEVEL!.toLowerCase()}` as unknown as LogLevel] as unknown as LogLevel;
    }

    private packageLogEvent(level: LogLevel, message: LogMessage, ...args: any[]): LogEvent {
        return {
            name: this.name,
            timestamp: Date.now(),
            level: level,
            message: {
                formatString: message,
                args: args
            },
            properties: this.properties,
            requestId: this.requestId,
            stack: level >= LogLevel.warn ? this.getStack() : undefined,
            buffer: this.logBuffer && level >= LogLevel.warn ? this.logBuffer.getLogs() : undefined,
            logCount: this.logBuffer ? this.logBuffer.getCount() + 1 : undefined,
        };
    }

    // TODO: maybe only enable this on warn and higher ... or trace only?
    private getStack(): StackTrace[] {
        let packagedStack = [];
        const stack = new Error().stack?.split("\n");

        // Help for this part came in part from the following code from errwischt
        // https://github.com/errwischt/stacktrace-parser/blob/master/src/stack-trace-parser.js
        const exp = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
        if (stack) {
            for (const line of stack) {
                const parts = exp.exec(line);
                if (parts) {
                    packagedStack.unshift({
                        file: parts[2],
                        methodName: parts[1] || "<unknown>",
                        arguments: [],
                        lineNumber: +parts[3],
                        column: parts[4] ? +parts[4] : null,
                    } as StackTrace);
                }
            }
        }
        return packagedStack;
    }
    //#endregion private utility methods

    //#region public class-level utility methods
    public setFormatter(formatter: LogFormatterStructure): LoggerStructure {
        this.formatter = formatter;
        return this;
    }

    public addStream(stream: Stream): LoggerStructure {
        this.streams!.push(stream);
        return this;
    }
    //#endregion public utility methods
}