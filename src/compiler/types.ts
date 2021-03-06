export interface LoggerStructure {
    trace(message: string | object | Error, ...args: any[]): void;
    debug(message: string | object | Error, ...args: any[]): void;
    info(message: string | object | Error, ...args: any[]): void;
    warn(message: string | object | Error, ...args: any[]): void;
    error(message: string | object | Error, ...args: any[]): void;
    fatal(message: string | object | Error, ...args: any[]): void;
    log(level: LogLevel, message: LogMessage, ...args: any[]): void;
    child(properties: object): LoggerStructure;
    addLogProperty(key: string, value: string | object): void;
    removeLogProperty(key: string): void;
    scope(key: string, property: string | object, fn: () => any): any;
    asyncScope(key: string, property: string | object, fn: () => Promise<any>): Promise<Boolean>;
    setFormatter(formatter: LogFormatterStructure): LoggerStructure;
    addStream(stream: Stream): LoggerStructure;
    mask(input: string | number | undefined): string;
};

export interface BufferStructure {
    add(event: LogEvent): void;
    getLogs(): SavedLogs;
    getCount(): number;
}

export interface LogFormatterStructure {
    format(event: LogEvent, outStream: any): void;
};

export enum LogLevel {
    trace,
    debug,
    info,
    warn,
    error,
    fatal,
    off
};

export type LogMessage = string | object | Error;

export type StackTrace = {
    file?: string | null;
    methodName?: string | null;
    arguments?: string[];
    lineNumber?: number | null;
    column?: string | null;
};

export type Stream = {
    name: string;
    outputStream: OutputStream;
    errorStream: OutputStream;
};

export type LogProperties = {
    [key: string]: any;
};

export type LogEvent = {
    name: string;
    timestamp: number;
    level: LogLevel;
    message: {
        formatString: LogMessage;
        args: any[];
    };
    properties: LogProperties;
    requestId?: string;
    stack?: StackTrace[];
    buffer?: SavedLogs;
    logCount?: number;
}

export type SavedLogs = {
    firstLogs: LogEvent[];
    lastLogs: LogEvent[];
    bufferSize: number;
}

export interface OutputStream {
    write(message: string): void;
}