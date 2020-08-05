"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./compiler/types");
class LogFormatter {
    format(event, outputStreams) {
        for (const s of outputStreams) {
            const stream = event.level >= 3 ? s.errorStream : s.outputStream;
            stream.write(`[${event.name} ${event.timestamp}] - [${types_1.LogLevel[event.level].toUpperCase()}] - ${event.message} \n`);
        }
    }
}
exports.default = LogFormatter;
