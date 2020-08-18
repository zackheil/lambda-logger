import Logger from './Logger/Logger';
import { LoggerStructure, LogFormatterStructure, LogLevel, LogMessage, Stream, LogProperties, LogEvent, OutputStream } from './compiler/types';
import LinearFormatter from './formatters/LinearFormatter';
import JSONFormatter from './formatters/JSONFormatter';

export {
    LoggerStructure,
    LogFormatterStructure,
    LogLevel,
    LogMessage,
    Stream,
    LogProperties,
    LogEvent,
    OutputStream,
    LinearFormatter,
    JSONFormatter
};

export default Logger;
