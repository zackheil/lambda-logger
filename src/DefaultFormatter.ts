import { LogFormatterStructure, LogEvent, Stream, LogLevel } from "./compiler/types";
import { format } from "util";

export default class LogFormatter implements LogFormatterStructure {
    format(event: LogEvent, outputStreams: Stream[]) {
        for (const s of outputStreams) {
            const output = event.level >= 3 ? s.errorStream : s.outputStream;

            // Output the log event info to a stream
            output.write(`[${event.timestamp} - ${LogLevel[event.level].toUpperCase()}]: ${format(event.message.formatString, ...event.message.args)}\n`);
            if (event.firstFive && event.level > LogLevel.info) {
                output.write(`\t${LogLevel[event.level].toUpperCase()}: Printing the first and last 5 log message to aid in issue reproduction:\n`);
                event.firstFive.forEach(msg => {
                    output.write(`\tLOG #${msg.logCount}: [${LogLevel[msg.level].toUpperCase()}]: ${format(msg.message.formatString, ...msg.message.args)}\n`);
                });
            }
            if (event.lastFive && event.level > LogLevel.info) {
                if (event.logCount > 10)
                    output.write(`\t[... ${event.logCount - 11} more messages ...]\n`);
                event.lastFive.forEach(msg => {
                    output.write(`\tLOG #${msg.logCount}: [${LogLevel[msg.level].toUpperCase()}]: ${format(msg.message.formatString, ...msg.message.args)}\n`);
                });
            }
        }
    }
}

