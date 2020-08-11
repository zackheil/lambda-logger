import { LogFormatterStructure, LogEvent, Stream, LogLevel } from "./compiler/types";
import format from "util";

export default class LogFormatter implements LogFormatterStructure {
    format(event: LogEvent, outputStreams: Stream[]) {
        for (const s of outputStreams) {
            const stream = event.level >= 3 ? s.errorStream : s.outputStream;
            stream.write(`[${event.name} ${event.timestamp}] - [${LogLevel[event.level].toUpperCase()}] - ${event.message}\n`);
        }
    }
}

