import Logger from './Logger/Logger';
import { LoggerStructure, LogFormatterStructure, LogLevel, LogMessage, Stream, LogProperties, LogEvent, OutputStream } from './compiler/types';
import LinearFormatter from './Logger/formatters/LinearFormatter';
import JSONFormatter from './Logger/formatters/JSONFormatter';

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
