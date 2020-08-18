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
} from "../compiler/types"
import LinearFormatter from "../formatters/LinearFormatter";
import DeadLogger from "./DeadLogger";
import RequestBuffer from "./RequestBuffer";
import crypto from "crypto";

/**
 * A logger for use exclusively with AWS Lambda and the 
 * serverless-offline plugin for local testing with Serverless.
 * 
 * **Note**: 
 * 
 * - Ensure `serverless.yml:provider.environment.LOG_LEVEL`
 * is set to use a custom log level besides 'info'.
 * - At the beginning of your handlers put 
 * `process.env.AWS_REQUEST_ID = context.awsRequestId;` to track 
 * logs using a buffer.
 */
export default class Logger implements LoggerStructure {
    private level: LogLevel;
    private formatter: LogFormatterStructure | undefined;
    private streams: Stream[] | undefined;
    private properties: LogProperties;
    private requestId: string | undefined;
    private logBuffer: BufferStructure | undefined;
    private parent: Logger | undefined;

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
        this.streams = noStdOut ? [] : [{ name: "default", outputStream: process.stdout, errorStream: process.stderr }];
        this.formatter = new LinearFormatter();
    }

    //#region public methods

    /**
     * Logs a trace message. Log the most granular data with this so inputs 
     * and outputs can be traced from function to function. Helpful with external libraries.
     * @param message {LogMessage} A format string, regular string message, object, or error.
     * @param args {any[]} Format string arguments or other concatenated LogMessage entries.
     */
    public trace(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.trace, message, ...args);
    }

    /**
     * Logs a debug message. Log details that would be useful for debugging with this method.
     * These messages should be helpful to other developers trying to debug foreign code.
     * @param message {LogMessage} A format string, regular string message, object, or error.
     * @param args {any[]} Format string arguments or other concatenated LogMessage entries.
     */
    public debug(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.debug, message, ...args);
    }

    /**
     * Logs an info message. These messages should give one general bearing of where you are 
     * in program execution. Info generally logs messages pertaining to steps in routine operation.
     * @param message {LogMessage} A format string, regular string message, object, or error.
     * @param args {any[]} Format string arguments or other concatenated LogMessage entries.
     */
    public info(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.info, message, ...args);
    }

    /**
     * Logs a warning message. These messages should alert the possibility of harmful occurences.
     * Use to indicate when something doesn't feel right or could cause problems further on.
     * @param message {LogMessage} A format string, regular string message, object, or error.
     * @param args {any[]} Format string arguments or other concatenated LogMessage entries.
     */
    public warn(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.warn, message, ...args);
    }

    /**
     * Logs an error message. These denote serious messages that should be dealt with.
     * Typically error messages are used when an anticipated problem arises in execution.
     * @param message {LogMessage} A format string, regular string message, object, or error.
     * @param args {any[]} Format string arguments or other concatenated LogMessage entries.
     */
    public error(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.error, message, ...args);
    }

    /**
     * Logs a fatal message. These messages signify that the program is going to break immently.
     * Use when something unexpected happens that could break the server or when the server is going down.
     * @param message {LogMessage} A format string, regular string message, object, or error.
     * @param args {any[]} Format string arguments or other concatenated LogMessage entries.
     */
    public fatal(message: LogMessage, ...args: any[]): void {
        this.log(LogLevel.fatal, message, ...args);
    }

    /**
     * A generic log message where one can pass in the log level enum value directly.
     * 
     * **NOTE**: `Logger.log(LogLevel.off, ...)` is a valid call, but is a completely useless 
     * and does nothing besides adding to program execution time.
     * @param level {LogLevel} Levels 'trace' through 'fatal' enumerated 0->5, respectively
     * @param message {LogMessage} A format string, regular string message, object, or error.
     * @param args {any[]} Format string arguments or other concatenated LogMessage entries.
     */
    public log(level: LogLevel, message: LogMessage, ...args: any[]): void {
        // If for some reason someone calls this with 'off' level, ignore and return immediately
        if (level === LogLevel.off) { return; }

        // Make sure we have somewhere to send this message
        if (!this.streams || !this.streams!.length) {
            throw new Error("There were no defined output streams and the default stream set was overridden!");
        }

        // In case the logger was defined globally in a handler file, check for reqId again:
        if (process.env.AWS_REQUEST_ID) {
            this.requestId = process.env.AWS_REQUEST_ID;
            if (!this.logBuffer) {
                if (this.parent)
                    this.logBuffer = this.parent.logBuffer;
                else
                    this.logBuffer = new RequestBuffer();
            };
        }

        const event = this.packageLogEvent(level, message, ...args);

        // If this is above the level threshold, broadcast the message to a stream
        if (level >= this.level) { this.formatter!.format(event, this.streams) };

        // Save the log event to the buffer (if applicable) after sending the message
        if (this.logBuffer) { this.logBuffer.add(event); }
    }

    /**
     * Copies the existing logger instance and adds properties that should be included 
     * in all future log messages. The property `name` has the special ability to 
     * overwrite the name of the logger.
     * 
     * **Use when**: there is a class/function/action that a logger needs to be 
     * injected in and knowing that the logs originated from that aforementioned group.
     * 
     * @param properties {object} A set of `key: value` pairs that should be included 
     * in all future logs using this logger
     * 
     * @example 
     * // Assume APILib(injectedLogger: LoggerStructure)
     * const globalLogger = new Logger();
     * (...)
     * const APIHelpers = new APILib(globalLogger.child({type: "API Call"}));
     */
    public child(properties: object): Logger {
        let name;
        Object.keys(properties).includes("name") ? name = (properties as any).name : name = this.name;

        let child = new Logger(name, true);

        child.formatter = this.formatter;
        child.streams = this.streams;
        child.logBuffer = this.logBuffer;
        child.parent = this;

        for (let [key, value] of Object.entries(this.properties))
            child.addLogProperty(key, value);

        for (let [key, value] of Object.entries(properties))
            child.addLogProperty(key, value);
        delete child.properties.name;

        return child;
    }

    /**
     * Adds a static property to the logger. This could be a static string for function context or an object. 
     * @param key {string} The key of the property that can be accessed in the formatter via `event.properties`
     * @param value {string | object} The value attached to the key
     */
    public addLogProperty(key: string, value: string | object) {
        this.properties[key] = value;
    }

    /**
     * Removes a property from the logger object property store.
     * @param key {string} The key of the property currently stored in the logger.
     */
    public removeLogProperty(key: string) {
        delete this.properties[key];
    }

    /**
     * Attach a Log property scope that is applied over the duration of a passed synchronous function
     * 
     * **Note**: Use `Logger.asyncScope` for async scoped function execution.
     * @param key {string} The key of the property that can be accessed in the formatter via `event.properties`
     * @param property {string | object} The value attached to the key
     * @param fn {function} a function (usually anonymous) that should be executed with the properties attached.
     */
    public scope(key: string, property: string | object, fn: () => any): any {
        this.addLogProperty(key, property);
        let result = fn();
        this.removeLogProperty(key);
        return result;
    }

    /**
     * Attach a Log property scope that is applied over the duration of a passed async function
     *
     * **Note**: Use `Logger.scope` for sync scoped function execution. Using async can result in performace loss.
     * @param key {string} The key of the property that can be accessed in the formatter via `event.properties`
     * @param property {string | object} The value attached to the key
     * @param fn {function} a function (usually anonymous) that should be executed with the properties attached.
     */
    public async asyncScope(key: string, property: string | object, fn: () => Promise<any>): Promise<Boolean> {
        this.addLogProperty(key, property);
        await fn();
        this.removeLogProperty(key);
        return true;
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

    // Currently on warning and higher levels
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
    /**
     * Attach the formatter class that the logs will pass to after being constructed.
     * @param formatter {LogFormatterStructure} The injected formatter following the structure of 
     * `LogFormatterStructure`.
     * 
     * @example // Make output logs a default json template
     * import Logger, {JSONFormatter} from "{at}zackheil/lambda-logger"
     * const log = new Logger.setFormatter(new JSONFormatter());
     */
    public setFormatter(formatter: LogFormatterStructure): LoggerStructure {
        this.formatter = formatter;
        return this;
    }

    /**
     * Push a new stream to the logger. By default, will broadcast all log messages 
     * to all supplied streams. If you are wanting to disable `stdout` and `stderr` in
     * favor of a log file stream, initialize the logger with the second argument true.
     * Custom behavior can be defined using a formatter with `Logger.setFormatter`
     * @param stream {Stream} A stream object with a name, and separate streams to send
     * errors and outputs to.
     * 
     * @example
     * const errsToFile = {
     *     name: "myStream",
     *     outputStream: process.stdout,
     *     errorStream: fs.createWriteStream('errors.log')
     * }
     * const log = new Logger("MyLogger", true).addStream(errsToFile);
     */
    public addStream(stream: Stream): LoggerStructure {
        this.streams!.push(stream);
        return this;
    }

    /**
     * Returns a MD5 hash of the string or number value passed into it. Useful when dealing
     * with enterprise or customer data that should be secured and unavailable. Helps in debugging
     * by showing a value actually exists and can be verified by MD5 hashing the original input value
     * and matching it to the logs. If undefined, will display `<private:undefined>`. 
     * If empty string, will display `<private:empty string>`.
     * @param input {string | number | undefined} The string or number that should be hashed.
     * 
     * @example
     * const cardNumber = DB.query(...);
     * Logger.debug("Got card number [%s] from DB", Logger.mask(cardNumber));
     * // Logs: Got card number [<private:masked> hash:'fd03204cfdc557b0f0d134773ae6fff5'] from DB
     */
    public mask(input: string | number | undefined): string {
        if (!input) { return `<private:undefined>`; }
        if (typeof (input) === "number") { input = String(input); }
        if (input.length === 0) { return `<private:empty string>`; }
        const md5 = crypto.createHash('md5').update(input).digest("hex");
        return `<private:masked> hash:'${md5}'`
    }
    //#endregion public utility methods
}