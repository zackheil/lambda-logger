import { LogFormatterStructure, LogEvent, Stream, LogLevel } from "./compiler/types";
import { format } from "util";

export default class LogFormatter implements LogFormatterStructure {
    format(event: LogEvent, outputStreams: Stream[]) {
        for (const s of outputStreams) {
            const output = event.level >= 3 ? s.errorStream : s.outputStream;

            // Output the log event info to a stream
            output.write(`[${event.timestamp} - ${LogLevel[event.level].toUpperCase()}]: ${format(event.message.formatString, ...event.message.args)}\n`);
            output.write("\tError: logging the first 5 and last 5 log message to aid in issue replication:\n");
            if (event.firstFive) {
                event.firstFive.forEach(msg => {
                    output.write(`\tLOG #${msg.logCount}: [${msg.timestamp} - ${LogLevel[msg.level].toUpperCase()}] - ${format(msg.message.formatString, ...msg.message.args)}\n`);
                });
            }
            if (event.lastFive) {
                output.write("\t[...]\n");
                event.lastFive.forEach(msg => {
                    output.write(`\tLOG #${msg.logCount}: [${msg.timestamp} - ${LogLevel[msg.level].toUpperCase()}] - ${format(msg.message.formatString, ...msg.message.args)}\n`);
                });
            }
        }
    }
}

