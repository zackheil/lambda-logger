import { BufferStructure, LogEvent, SavedLogs } from "./compiler/types";

export default class RequestBuffer implements BufferStructure {
    private count: number;

    private firstLogs: LogEvent[];
    private lastLogs: LogEvent[];
    constructor(private bufferSize: number = 5) {
        // this.requestId = typeof (process.env.AWS_REQUEST_ID) === "string" ? process.env.AWS_REQUEST_ID : "UNUSED";
        this.count = 1;
        this.firstLogs = [];
        this.lastLogs = [];
    }

    public add(event: LogEvent): void {
        this.count++;

        const e: LogEvent = {
            name: event.name,
            timestamp: event.timestamp,
            level: event.level,
            message: event.message,
            properties: event.properties,
            stack: event.stack,
            logCount: event.logCount,
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

    public getLogs(): SavedLogs {
        return {
            firstLogs: this.firstLogs,
            lastLogs: this.lastLogs,
            bufferSize: this.bufferSize
        };
    }

    public getCount(): number {
        return this.count;
    }
}