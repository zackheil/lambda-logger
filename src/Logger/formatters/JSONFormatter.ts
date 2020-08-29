import { LogFormatterStructure, LogEvent, Stream, LogLevel, OutputStream } from "../../compiler/types";
import { format } from "util";
import crypto from "crypto";

export default class JSONFormatter implements LogFormatterStructure {
    format(event: LogEvent, outputStreams: Stream[]) {
        for (const s of outputStreams) {
            // If the level is 'warn', 'error', or 'fatal', then send to errorStream
            const output = event.level >= LogLevel.warn ? s.errorStream : s.outputStream;

            output.write("{");
            this.localNewLine(output);

            // Write the timestamp
            this.writeKVPair("Timestamp", event.timestamp, output);
            output.write(",");
            this.localNewLine(output);

            // Write the log level
            this.writeKVPair("Level", LogLevel[event.level].toUpperCase(), output);
            output.write(",");
            this.localNewLine(output);

            // Write the formatted message string
            this.writeKVPair("Message", format(event.message.formatString, ...event.message.args), output);

            // (At this point, the rest of the attributes are optional, so they need to have the comma come next)

            // If applicable, write the message hash for easier querying of formatStrings
            if (typeof (event.message.formatString) === "string") {
                output.write(",");
                this.localNewLine(output);
                const hash = crypto.createHash('md5').update(event.message.formatString as string).digest("hex").substr(0, 8).toUpperCase();
                this.writeKVPair("MessageHash", hash, output);
            }

            // If applicable, write the AWS Request Id and log count
            if (event.requestId) {
                output.write(",");
                this.localNewLine(output);
                this.writeKVPair("RequestId", event.requestId, output);

                output.write(",");
                this.localNewLine(output);
                this.writeKVPair("LogCount", event.logCount!, output);
            }

            // Add misc log properties as root level attributes
            this.addProperties(event, output);

            // Add debug helping info
            if (event.buffer && event.level > LogLevel.info) {
                this.addStoredLogs(event, output);
            }


            // Close the log object
            this.localNewLine(output);
            output.write("}\n");
        }
    }

    writeKVPair(key: string, value: string | number | boolean, output: OutputStream): void {
        this.localIndent(output);
        output.write(`"${key}":"${value}"`);
    }

    localNewLine(output: OutputStream): void {
        if (process.env.IS_OFFLINE) { output.write("\n"); }
    }

    localIndent(output: OutputStream, spaces: number = 2): void {
        if (process.env.IS_OFFLINE) {
            for (let i = 0; i < spaces; i++)
                output.write(" ");
        }
    }

    addProperties(event: LogEvent, output: OutputStream): void {
        if (Object.keys(event.properties).length === 0) { return; }

        for (let [key, value] of Object.entries(event.properties)) {
            if (typeof (value) === "string") {
                output.write(",");
                this.localNewLine(output);
                this.writeKVPair(key, value, output);
            }
            else {
                output.write(",");
                this.localNewLine(output);
                this.writeKVPair(key, JSON.stringify(value), output); // probably fix later on. I see issues with objects
            }
        }
    }

    addStoredLogs(event: LogEvent, output: OutputStream): void {
        output.write(",");
        this.localNewLine(output);
        this.localIndent(output);
        output.write(`"PreviousLogs":[`);

        let first = true;
        event.buffer!.firstLogs.forEach(msg => {
            if (!first) { output.write(","); }
            this.localNewLine(output);
            this.localIndent(output, 4);
            output.write(`"LOG #${msg.logCount}: [${LogLevel[msg.level].toUpperCase()}]: ${format(msg.message.formatString, ...msg.message.args)}"`);
            first = false;
        });
        event.buffer!.lastLogs.forEach(msg => {
            output.write(",");
            this.localNewLine(output);
            this.localIndent(output, 4);
            output.write(`"LOG #${msg.logCount}: [${LogLevel[msg.level].toUpperCase()}]: ${format(msg.message.formatString, ...msg.message.args)}"`);
            first = false;
        });
        this.localNewLine(output);
        this.localIndent(output)
        output.write("]");
    }
}
