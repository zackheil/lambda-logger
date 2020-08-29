const Logger = require("../../dist").default;

// Stream wrapper to expose the log output as a variable and not to stdout
var logOutput;
class Stream {
    write(string) {
        logOutput = string;
    }
}
var outStream = new Stream();
const wrappedStream = {
    name: "test-stream",
    outputStream: outStream,
    errorStream: outStream
}

// Formatter to display the log output as its entire object and not a formatted ...format
class Formatter {
    format(event, output) {
        output[0].outputStream.write(event);
    }
}

// Logger definition that the following tests will use
let unnamedLogger = new Logger(undefined, true).setFormatter(new Formatter()).addStream(wrappedStream);

let loggerName = "my-logger";
const logger = new Logger(loggerName, true).setFormatter(new Formatter()).addStream(wrappedStream);


// Begin test suite to validate the LogEvent structure
describe("Log Event Structure", () => {
    it("bare-bones logger LogEvent", () => {

        logger.info("test");

        let testObj = {
            buffer: undefined,
            level: 2,
            logCount: undefined,
            message: {
                formatString: "test",
                args: [],
            },
            name: "my-logger",
            properties: {},
            requestId: undefined,
            stack: undefined,
            timestamp: logOutput.timestamp, 
        };

        expect(logOutput).toEqual(testObj);
    });

    it("LogEvent 'name' field", () => {

        // Test if the logger isn't run in an AWS Lambda env and is not named
        unnamedLogger.info("test");
        expect(logOutput.name).toBeUndefined();

        // Test if the logger is run in an AWS Lambda env and is not named
        process.env.AWS_LAMBDA_FUNCTION_NAME = "lambda-function-name";
        unnamedLogger = new Logger(undefined, true).setFormatter(new Formatter()).addStream(wrappedStream);
        unnamedLogger.info("test");
        expect(logOutput.name).toEqual("lambda-function-name");

        // Test to see if the logger name matches the constructor value
        logger.info("test");
        expect(logOutput.name).toEqual(loggerName);
    });

    it("basic logger stack to be undefined (<=info)", () => {

        logger.info("this is a test");

        expect(logOutput.stack).toBeUndefined();
    });

    it("basic logger stack to be defined (>info)", () => {

        logger.warn("this is a test");

        expect(logOutput.stack).toBeDefined();
    });

    it("basic logger instance with string args", () => {

        logger.info("this is a %s", "test");

        let testObj = {
            buffer: undefined,
            level: 2,
            logCount: undefined,
            message: {
                formatString: "this is a %s",
                args: ["test"],
            },
            name: "my-logger",
            properties: {},
            requestId: undefined,
            stack: undefined,
            timestamp: logOutput.timestamp, 
        };

        expect(logOutput).toEqual(testObj);
    });

    it("basic logger instance (+requestId, <=info)", () => {

        process.env.AWS_REQUEST_ID = "1"
        logger.info("this is a %s", "test");

        let testObj = {
            buffer: undefined,
            level: 2,
            logCount: 1,
            message: {
                formatString: "this is a %s",
                args: ["test"],
            },
            name: "my-logger",
            properties: {},
            requestId: process.env.AWS_REQUEST_ID,
            stack: undefined,
            timestamp: logOutput.timestamp, 
        };

        expect(logOutput).toEqual(testObj);
    });

    it("basic logger instance (+requestId, >info)", () => {

        process.env.AWS_REQUEST_ID = "2"
        logger.info("1");
        logger.info("2");
        logger.info("3");
        logger.info("4");
        logger.info("5");
        logger.info("6");
        logger.info("7");
        logger.info("8");
        logger.info("9");
        logger.info("10");
        logger.warn("this is a warning");

        expect(logOutput.buffer).toBeDefined();

        expect(logOutput.buffer.firstLogs.length).toEqual(5);
        expect(logOutput.buffer.lastLogs.length).toEqual(5);
        expect(logOutput.logCount).toEqual(11);
    });
});