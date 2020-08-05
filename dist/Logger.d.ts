import { LoggerStructure, LogFormatterStructure, LogLevel, LogMessage, Stream } from "./compiler/types";
export default class Logger implements LoggerStructure {
    private name;
    private formatter;
    private streams;
    private properties;
    constructor(name?: string, overrideDefaults?: Boolean);
    trace(message: LogMessage, ...args: any[]): void;
    debug(message: LogMessage, ...args: any[]): void;
    info(message: LogMessage, ...args: any[]): void;
    warn(message: LogMessage, ...args: any[]): void;
    error(message: LogMessage, ...args: any[]): void;
    fatal(message: LogMessage, ...args: any[]): void;
    log(level: LogLevel, message: LogMessage, ...args: any[]): void;
    child(properties: object): Logger;
    addLogProperty(key: string, value: any): void;
    removeLogProperty(key: string): void;
    attachPropertyScope(key: string, property: string | object, cb: () => any): any;
    private packageLogEvent;
    private getStack;
    setFormatter(formatter: LogFormatterStructure): LoggerStructure;
    addStream(stream: Stream): LoggerStructure;
}
