import { LoggerStructure, LogLevel, LogFormatterStructure, Stream, LogProperties } from "./compiler/types";

export default class DeadLogger implements LoggerStructure {

    constructor() {
    }
    trace(message: string | object | Error, ...args: any[]): void { return; }
    debug(message: string | object | Error, ...args: any[]): void { return; }
    info(message: string | object | Error, ...args: any[]): void { process.stdout.write("yay"); return; }
    warn(message: string | object | Error, ...args: any[]): void { return; }
    error(message: string | object | Error, ...args: any[]): void { return; }
    fatal(message: string | object | Error, ...args: any[]): void { return; }
    log(level: LogLevel, message: string | object | Error, ...args: any[]): void { return; }
    child(properties: object): LoggerStructure { return this; }
    addLogProperty(key: string, value: any): void { return; }
    removeLogProperty(key: string): void { return; }
    attachPropertyScope(key: string, property: string | object, cb: () => any) { return; }
    setFormatter(formatter: LogFormatterStructure): LoggerStructure { return this; }
    addStream(stream: Stream): LoggerStructure { return this; }
    getLevel() { return; }
    packageLogEvent() { return; }
    addToBuffer() { return; }
    getStack() { return; }
}