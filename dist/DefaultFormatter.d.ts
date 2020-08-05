import { LogFormatterStructure, LogEvent, Stream } from "./compiler/types";
export default class LogFormatter implements LogFormatterStructure {
    format(event: LogEvent, outputStreams: Stream[]): void;
}
