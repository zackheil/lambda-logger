import { LogFormatterStructure, LogEvent, Stream, LogLevel } from "../../compiler/types";
import { format } from "util";

export default class LinearFormatter implements LogFormatterStructure {
    format(event: LogEvent, outputStreams: Stream[]) {
        for (const s of outputStreams) {
            const output = event.level >= 3 ? s.errorStream : s.outputStream;

            // Output the log event info to a stream
            output.write(`[${event.timestamp} - ${LogLevel[event.level].toUpperCase()}]: ${format(event.message.formatString, ...event.message.args)}\n`);
            if (event.buffer && event.level > LogLevel.info) {
                output.write(`\t${LogLevel[event.level].toUpperCase()}: Printing the first and last ${event.buffer.bufferSize} log message to aid in issue reproduction:\n`);
                event.buffer.firstLogs.forEach(msg => {
                    output.write(`\tLOG #${msg.logCount}: [${LogLevel[msg.level].toUpperCase()}]: ${format(msg.message.formatString, ...msg.message.args)}\n`);
                });

                if (event.logCount! > (event.buffer.bufferSize * 2) + 1)
                    output.write(`\t[... ${event.logCount! - ((event.buffer.bufferSize * 2) + 1)} more messages ...]\n`);
                event.buffer.lastLogs.forEach(msg => {
                    output.write(`\tLOG #${msg.logCount}: [${LogLevel[msg.level].toUpperCase()}]: ${format(msg.message.formatString, ...msg.message.args)}\n`);
                });
            }
        }
    }
}

