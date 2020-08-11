import { LoggerStructure, LogFormatterStructure, LogEvent, LogLevel, LogMessage, StackTrace, Stream, LogProperties } from "./compiler/types"
import DefaultFormatter from "./DefaultFormatter";

// TODO: convert to Object.prototype instead of using a class for +20x perf boost

export default class Logger implements LoggerStructure {
    private name: string;
    private level: LogLevel;
    private formatter: LogFormatterStructure | undefined;
    private streams: Stream[] | undefined;
    private properties: LogProperties;

    // TODO: will need to do testing if moving array values is more expensive than 5 vars
    private firstFive: LogEvent[];
    private lastFive: LogEvent[];
    private requestId: string;

    constructor(name: string = process.env.AWS_LAMBDA_FUNCTION_NAME!, overrideDefaults?: Boolean) {
        this.name = name;
        this.properties = {};
        this.level = LogLevel[`${process.env.LOG_LEVEL}` as unknown as LogLevel] as unknown as LogLevel || 1;

        this.requestId = typeof (process.env.AWS_REQUEST_ID) === "string" ? process.env.AWS_REQUEST_ID : "UNUSED";
        this.firstFive = [];
        this.lastFive = [];

        if (!overrideDefaults) {
            this.formatter = new DefaultFormatter();
            this.streams = [{
                outputStream: process.stdout,
                errorStream: process.stderr
            }];
        }

        // TODO ?
        // if (this.level = LogLevel.trace) { this.trace("Notice: LAMBDA COLD START"); }

    }

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
        if (!this.formatter || !this.streams) {
            const err = `The following weren't defined in the logger: ${this.formatter ? "" : "[formatter] "}` +
                `${this.streams ? "" : "[streams]"}. If you are going to override the defaults, you must use ` +
                `the appropriate method to set them.`
            throw new Error(err);
        }

        // Update some global info
        if (this.requestId !== "UNUSED") {
            // If this is a new AWS Request ID, then reset the first and last logs
            if (this.requestId !== process.env.AWS_REQUEST_ID!) {
                this.firstFive = [];
                this.lastFive = [];
                this.requestId = process.env.AWS_REQUEST_ID!;
            }
        }

        const event = this.packageLogEvent(level, message, args);

        // If this is above the level threshold, broadcast the message to a stream
        if (level >= this.level) { this.formatter.format(event, this.streams) };
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

    private packageLogEvent(level: LogLevel, message: LogMessage, ...args: any[]): LogEvent {
        let event = {
            name: this.name,
            timestamp: new Date().getTime(),
            level: level,
            message: {
                formatString: message,
                args: args
            },
            properties: this.properties,
            stack: this.getStack(),
            firstFive: level >= LogLevel.warn ? this.firstFive : undefined,
            lastFive: level >= LogLevel.warn ? this.lastFive : undefined,
        };

        if (this.requestId !== "UNUSED") {
            if (this.firstFive.length < 5) {
                this.firstFive.push(event);
            }
            if (this.lastFive.length >= 5) {
                this.lastFive.shift()
            }
            this.lastFive.push(event);
        }

        return event;
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

    public setFormatter(formatter: LogFormatterStructure): LoggerStructure {
        this.formatter = formatter;
        return this;
    }

    public addStream(stream: Stream): LoggerStructure {
        this.streams?.push(stream);
        return this;
    }
}