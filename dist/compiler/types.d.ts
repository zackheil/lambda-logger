export interface LoggerStructure {
    trace(message: string | object | Error, ...args: any[]): void;
    debug(message: string | object | Error, ...args: any[]): void;
    info(message: string | object | Error, ...args: any[]): void;
    warn(message: string | object | Error, ...args: any[]): void;
    error(message: string | object | Error, ...args: any[]): void;
    fatal(message: string | object | Error, ...args: any[]): void;
    log(level: LogLevel, message: LogMessage, ...args: any[]): void;
    child(properties: object): LoggerStructure;
    addLogProperty(key: string, value: any): void;
    removeLogProperty(key: string): void;
    attachPropertyScope(key: string, property: string | object, cb: () => any): any;
    setFormatter(formatter: LogFormatterStructure): LoggerStructure;
    addStream(stream: Stream): LoggerStructure;
}
export interface LogFormatterStructure {
    format(event: LogEvent, outStream: any): void;
}
export declare enum LogLevel {
    trace = 0,
    debug = 1,
    info = 2,
    warn = 3,
    error = 4,
    fatal = 5
}
export declare type LogMessage = string | object | Error;
export declare type StackTrace = {
    file?: string | null;
    methodName?: string | null;
    arguments?: string[];
    lineNumber?: number | null;
    column?: string | null;
};
export declare type Stream = {
    outputStream: OutputStream;
    errorStream: OutputStream;
};
export declare type LogProperties = {
    [key: string]: any;
};
export declare type LogEvent = {
    name: string;
    timestamp: number;
    level: LogLevel;
    message: LogMessage;
    stack: StackTrace[];
    properties: LogProperties;
};
export interface OutputStream {
    write(message: string): void;
}
