import { LoggerStructure, LogLevel, LogFormatterStructure, Stream } from "../compiler/types";

export default class DeadLogger implements LoggerStructure {
    trace(message: string | object | Error, ...args: any[]): void { return; }
    debug(message: string | object | Error, ...args: any[]): void { return; }
    info(message: string | object | Error, ...args: any[]): void { return; }
    warn(message: string | object | Error, ...args: any[]): void { return; }
    error(message: string | object | Error, ...args: any[]): void { return; }
    fatal(message: string | object | Error, ...args: any[]): void { return; }
    log(level: LogLevel, message: string | object | Error, ...args: any[]): void { return; }
    child(properties: object): LoggerStructure { return this; }
    addLogProperty(key: string, value: string | object): void { return; }
    removeLogProperty(key: string): void { return; }
    scope(key: string, property: string | object, cb: () => any) { return; }
    async asyncScope(key: string, property: string | object, cb: () => Promise<Boolean>) { return true; }
    setFormatter(formatter: LogFormatterStructure): LoggerStructure { return this; }
    addStream(stream: Stream): LoggerStructure { return this; }
    mask(input: string | number | undefined): string { return ""; }
}