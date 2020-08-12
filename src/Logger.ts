import { LoggerStructure, LogFormatterStructure, LogEvent, LogLevel, LogMessage, StackTrace, Stream, LogProperties } from "./compiler/types"
import DefaultFormatter from "./DefaultFormatter";

// TODO: convert to Object.prototype instead of using a class for +20x perf boost

export default class Logger implements LoggerStructure {
    private level: LogLevel;
    private formatter: LogFormatterStructure | undefined;
    private streams: Stream[] | undefined;
    private properties: LogProperties;
    private firstFive: LogEvent[];
    private lastFive: LogEvent[];
    private requestId: string;
    private logCount: number;

    constructor(private name: string = process.env.AWS_LAMBDA_FUNCTION_NAME!, noStdOutStream?: Boolean) {

        this.level = this.getLogLevel();
        this.properties = {};
        this.streams = noStdOutStream ? [] : [{
            outputStream: process.stdout,
            errorStream: process.stderr
        }];
        this.formatter = new DefaultFormatter();
        this.requestId = typeof (process.env.AWS_REQUEST_ID) === "string" ? process.env.AWS_REQUEST_ID : "UNUSED";
        this.firstFive = [];
        this.lastFive = [];
        this.logCount = 1;
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
        if (this.streams === []) {
            throw new Error("There were no defined output streams and the default stream set was overridden!");
        }

        // Update some global info
        if (this.requestId !== "UNUSED") {
            // If this is a new AWS Request ID, then reset the first and last logs
            if (this.requestId !== process.env.AWS_REQUEST_ID!) {
                this.firstFive = [];
                this.lastFive = [];
                this.requestId = process.env.AWS_REQUEST_ID!;
                this.logCount = 1;
            }
        }

        const event = this.packageLogEvent(level, message, ...args);

        // If this is above the level threshold, broadcast the message to a stream
        if (level >= this.level) { this.formatter!.format(event, this.streams) };

        // Add the message to the debugging stream 
        if (this.requestId !== "UNUSED") {
            this.addToBuffer(level, message, ...args);
            this.logCount++;
        }
    }

    // TODO Refactor or remove this functionality
    public child(properties: object): Logger {

        let name;
        Object.keys(properties).includes("name") ? name = (properties as any).name : name = this.name;

        let child = new Logger(name, true);

        // Having the child have custom streams might be a good future feature
        child.formatter = this.formatter;
        child.streams = this.streams;
        child.properties = this.properties;

        for (let [key, value] of Object.entries(properties))
            child.addLogProperty(key, value);
        delete child.properties.name;

        return child;
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
    private getLogLevel(): LogLevel {
        // Set the log level (default level of 'info')
        if (typeof (process.env.LOG_LEVEL) === "undefined") { return LogLevel.info; }

        let lvl = process.env.LOG_LEVEL.toLowerCase();
        let lvls = ["trace", "debug", "info", "warn", "error", "fatal"];
        if (!lvls.includes(lvl)) { return LogLevel.info; }

        return LogLevel[`${process.env.LOG_LEVEL!.toLowerCase()}` as unknown as LogLevel] as unknown as LogLevel;
    }

    private packageLogEvent(level: LogLevel, message: LogMessage, ...args: any[]): LogEvent {
        return {
            name: this.name,
            timestamp: new Date().getTime(),
            level: level,
            message: {
                formatString: message,
                args: args
            },
            properties: this.properties,
            stack: level >= LogLevel.warn ? this.getStack() : undefined,
            firstFive: level >= LogLevel.warn ? this.firstFive : undefined,
            lastFive: level >= LogLevel.warn ? this.lastFive : undefined,
            logCount: this.logCount
        };
    }

    private addToBuffer(level: LogLevel, message: LogMessage, ...args: any[]): void {
        let nonCircularEvent = {
            name: this.name,
            timestamp: new Date().getTime(),
            level: level,
            message: {
                formatString: message,
                args: args
            },
            properties: this.properties,
            stack: level >= LogLevel.warn ? this.getStack() : undefined,
            logCount: this.logCount
        };

        if (this.firstFive.length < 5) {
            this.firstFive.push(nonCircularEvent);
        }
        if (this.lastFive.length >= 5) {
            this.lastFive.shift()
        }
        if (this.logCount > 5) {
            this.lastFive.push(nonCircularEvent);
        }
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