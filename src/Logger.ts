import { LoggerStructure, LogFormatterStructure, LogEvent, LogLevel, LogMessage, StackTrace, Stream, LogProperties } from "./compiler/types"
import DefaultFormatter from "./DefaultFormatter";

// TODO:    setup the cached logs
//          establish a log level

export default class Logger implements LoggerStructure {
    private name: string;
    private formatter: LogFormatterStructure | undefined;
    private streams: Stream[] | undefined;
    private properties: LogProperties;

    constructor(name: string = process.env.AWS_LAMBDA_FUNCTION_NAME!, overrideDefaults?: Boolean) {
        this.name = name;
        this.properties = {};

        if(!overrideDefaults) {
            this.formatter = new DefaultFormatter();
            this.streams = [{
                outputStream: process.stdout,
                errorStream: process.stderr
            }];
        }
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

    public log(level: LogLevel, message: LogMessage, ...args: any[]) {
        if(!this.formatter || !this.streams) {
            const err = `The following weren't defined in the logger: ${this.formatter ? "" : "[formatter] "}` + 
                `${this.streams ? "" : "[streams]"}. If you are going to override the defaults, you must use ` +
                `the appropriate method to set them.`
            throw new Error(err);
        }
        const event = this.packageLogEvent(level, message);
        this.formatter.format(event, this.streams);
    }

    // This method only exists for compatability with bunyan and pino
    public child(properties: object): Logger {

        let name;
        Object.keys(properties).includes("name") ? name = (properties as any).name : name = this.name;

        let child = new Logger(name, true);

        // Having the child have custom streams might be a good future feature
        child.formatter = this.formatter;
        child.streams = this.streams;
        child.properties = this.properties;
        
        for(let [key, value] of Object.entries(properties))
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

    public attachPropertyScope(key: string, property: string | object, cb: () => any): any {
        this.addLogProperty(key, property);
        let result = cb();
        this.removeLogProperty(key);
        return result;
    }

    private packageLogEvent(level: LogLevel, message: LogMessage): LogEvent {
        return {
            name: this.name,
            timestamp: new Date().getTime(),
            level: level,
            message: message,
            properties: this.properties,
            stack: this.getStack(),
        };
    }

    private getStack(): StackTrace[] {
        let packagedStack = [];
        const stack = new Error().stack?.split("\n");

        // Help for this part came in part from the following code from errwischt
        // https://github.com/errwischt/stacktrace-parser/blob/master/src/stack-trace-parser.js
        const exp = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
        if(stack) {
            for(const line of stack) {
                const parts = exp.exec(line);
                if(parts) {
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