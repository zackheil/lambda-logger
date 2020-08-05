"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./compiler/types");
const DefaultFormatter_1 = __importDefault(require("./DefaultFormatter"));
class Logger {
    constructor(name = process.env.AWS_LAMBDA_FUNCTION_NAME, overrideDefaults) {
        this.name = name;
        this.properties = {};
        if (!overrideDefaults) {
            this.formatter = new DefaultFormatter_1.default();
            this.streams = [{
                    outputStream: process.stdout,
                    errorStream: process.stderr
                }];
        }
    }
    trace(message, ...args) {
        this.log(types_1.LogLevel.trace, message, ...args);
    }
    debug(message, ...args) {
        this.log(types_1.LogLevel.debug, message, ...args);
    }
    info(message, ...args) {
        this.log(types_1.LogLevel.info, message, ...args);
    }
    warn(message, ...args) {
        this.log(types_1.LogLevel.warn, message, ...args);
    }
    error(message, ...args) {
        this.log(types_1.LogLevel.error, message, ...args);
    }
    fatal(message, ...args) {
        this.log(types_1.LogLevel.fatal, message, ...args);
    }
    log(level, message, ...args) {
        if (!this.formatter || !this.streams) {
            const err = `The following weren't defined in the logger: ${this.formatter ? "" : "[formatter] "}` +
                `${this.streams ? "" : "[streams]"}. If you are going to override the defaults, you must use ` +
                `the appropriate method to set them.`;
            throw new Error(err);
        }
        const event = this.packageLogEvent(level, message);
        this.formatter.format(event, this.streams);
    }
    child(properties) {
        let name;
        Object.keys(properties).includes("name") ? name = properties.name : name = this.name;
        let child = new Logger(name, true);
        child.formatter = this.formatter;
        child.streams = this.streams;
        child.properties = this.properties;
        for (let [key, value] of Object.entries(properties))
            child.addLogProperty(key, value);
        delete child.properties.name;
        return child;
    }
    addLogProperty(key, value) {
        this.properties[key] = value;
    }
    removeLogProperty(key) {
        delete this.properties[key];
    }
    attachPropertyScope(key, property, cb) {
        this.addLogProperty(key, property);
        let result = cb();
        this.removeLogProperty(key);
        return result;
    }
    packageLogEvent(level, message) {
        return {
            name: this.name,
            timestamp: new Date().getTime(),
            level: level,
            message: message,
            properties: this.properties,
            stack: this.getStack(),
        };
    }
    getStack() {
        var _a;
        let packagedStack = [];
        const stack = (_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.split("\n");
        const exp = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
        if (stack) {
            for (const line of stack) {
                const parts = exp.exec(line);
                if (parts) {
                    packagedStack.unshift({
                        file: parts[2],
                        methodName: parts[1] || "<unknown>",
                        arguments: [],
                        lineNumber: +parts[3],
                        column: parts[4] ? +parts[4] : null,
                    });
                }
            }
        }
        return packagedStack;
    }
    setFormatter(formatter) {
        this.formatter = formatter;
        return this;
    }
    addStream(stream) {
        var _a;
        (_a = this.streams) === null || _a === void 0 ? void 0 : _a.push(stream);
        return this;
    }
}
exports.default = Logger;
