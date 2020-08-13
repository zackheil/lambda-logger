import { BufferStructure, LogEvent } from "./compiler/types";

export default class RequestBuffer implements BufferStructure {
    private count: number;

    private firstLogs: LogEvent[];
    private lastLogs: LogEvent[];
    constructor(private bufferSize: number = 5) {
        // this.requestId = typeof (process.env.AWS_REQUEST_ID) === "string" ? process.env.AWS_REQUEST_ID : "UNUSED";
        this.count = 0;
        this.firstLogs = [];
        this.lastLogs = [];
    }

    add(event: LogEvent): void {
        this.count++;

        const e: LogEvent = {
            name: event.name,
            timestamp: event.timestamp,
            level: event.level,
            message: event.message,
            properties: event.properties,
            logCount: this.count,
            requestId: event.requestId
        };

        // I have a suspicion that this could be done better
        if (this.firstLogs.length < this.bufferSize) {
            this.firstLogs.push(e);
        }
        if (this.lastLogs.length >= this.bufferSize) {
            this.lastLogs.shift()
        }
        if (this.count > this.bufferSize) {
            this.lastLogs.push(e);
        }
    }

    getLogs(): LogEvent[] {
        return [];
    }

    getCount(): number {
        return this.count;
    }
}