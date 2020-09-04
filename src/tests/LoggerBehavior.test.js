const Logger = require("../../dist").default;

// Stream wrapper to expose the log output as a variable and not to stdout
var logOutputDestringified = {};
var logOutputActual;
class Stream {
    write(output) {
        /* 
        This is the exact object produced by the logger and references "live" 
        Logger objects, similar to a "&Logger" would work in an analogous C
        implementation. In other words, this value can change and not represent
        a logger call moments after the call completes. 
        */
        logOutputActual = output;

        /* 
        This is a hacky deep-copy of the exact object produced by the logger,
        removing explicit undefined values in LogEvent as a side effect. This 
        references Logger objects "frozen in time" and accurately shows what is
        output to stdout 
        */
        logOutputDestringified = JSON.parse(JSON.stringify(output));



        /* 
        So why the distinction between the above values? Why are both needed?
        Take for example a log property scope:

        logger.info("this is a log");
        console.log(logOutputActual.properties); <--------------- outputs '{}'
        console.log(logOutputDestringified.properties); <-------- outputs '{}'

        logger.scope("foo", "bar", () => {
            logger.info("this is a log");

            console.log(logOutputActual.properties); 
            ^^ outputs '{foo: "bar"}'

            console.log(logOutputDestringified.properties); 
            ^^ outputs '{foo: "bar"}'
        });
        
        // Looking at the last log will show properties exist, right? Wrong:
        console.log(logOutputActual.properties); 
        ^^ outputs '{}'

        console.log(logOutputDestringified.properties);
        ^^ outputs '{foo: "bar"}'

        So adding an expect() test where the above console.log messages are and 
        looking for foobar would result in a failed test, but this doesn't 
        accurately reflect how the logger works or delivers to stdout.
        */
    }
}
var outStream = new Stream();
const unitTestStream = {
    name: "test-stream",
    outputStream: outStream,
    errorStream: outStream
}

// Formatter to display the log output as the raw LogEvent object
class UnitTestFormatter {
    format(event, output) {
        output[0].outputStream.write(event);
    }
}

// Begin test suites:
describe("The LogEvent.name field:", () => {

    // Define loggers specific to this test suite:
    let loggerName = "my-logger";
    let logger = new Logger(loggerName, true)
        .setFormatter(new UnitTestFormatter())
        .addStream(unitTestStream);

    let unnamedLogger = new Logger(undefined, true)
        .setFormatter(new UnitTestFormatter())
        .addStream(unitTestStream);

    it("must be undefined if not in AWS Lambda function & not named.", () => {
        unnamedLogger.info("test");
        expect(logOutputDestringified.name).toBeUndefined();
    });

    it("must take the name of the AWS Lambda function if not named.", () => {
        // Emulate creating the logger in a Lambda handler function
        process.env.AWS_LAMBDA_FUNCTION_NAME = "lambda-function-name";
        unnamedLogger = new Logger(undefined, true)
            .setFormatter(new UnitTestFormatter())
            .addStream(unitTestStream);

        unnamedLogger.info("test");
        expect(logOutputDestringified.name).toEqual("lambda-function-name");
    });

    it("must take the name from the constructor as a priority.", () => {
        // Emulate creating the logger in a Lambda handler function
        process.env.AWS_LAMBDA_FUNCTION_NAME = "lambda-function-name";
        unnamedLogger = new Logger(loggerName, true)
            .setFormatter(new UnitTestFormatter())
            .addStream(unitTestStream);

        logger.info("test");
        expect(logOutputDestringified.name).toEqual(loggerName);
    });
});


/*


it("LogEvent 'level' field", () => {

    // Test if the logger defaults to info if !process.env.LOG_LEVEL
    logOutput = undefined;
    logger.trace("test");
    expect(logOutput).toBeUndefined();

    logOutput = undefined;
    logger.debug("test");
    expect(logOutput).toBeUndefined();

    logOutput = undefined;
    logger.info("test");
    expect(logOutput).toBeDefined();

    logOutput = undefined;
    logger.warn("test");
    expect(logOutput).toBeDefined();

    logOutput = undefined;
    logger.error("test");
    expect(logOutput).toBeDefined();

    logOutput = undefined;
    logger.fatal("test");
    expect(logOutput).toBeDefined();

    // Test if the logger is run in an AWS Lambda env and is not named
    process.env.AWS_LAMBDA_FUNCTION_NAME = "lambda-function-name";
    unnamedLogger = new Logger(undefined, true).setFormatter(new UnitTestFormatter()).addStream(unitTestStream);
    unnamedLogger.info("test");
    expect(logOutput.name).toEqual("lambda-function-name");

    // Test to see if the logger name matches the constructor value
    logger.info("test");
    expect(logOutput.name).toEqual(loggerName);
});

*/