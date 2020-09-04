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

describe("The LogEvent.level field:", () => {

    /* 
    This test inadvertently tests LoggerBehavior of log level output due to the 
    following line. This test may fail if the level censor functionaliy changes
    */
    process.env.LOG_LEVEL = 'trace';
    let logger = new Logger("my-logger", true)
        .setFormatter(new UnitTestFormatter())
        .addStream(unitTestStream);

    it("must be 0 for a logger.trace() method call.", () => {
        logger.trace("test");
        expect(logOutputDestringified.level).toEqual(0);
    });

    it("must be 1 for a logger.debug() method call.", () => {
        logger.debug("test");
        expect(logOutputDestringified.level).toEqual(1);
    });

    it("must be 2 for a logger.info() method call.", () => {
        logger.info("test");
        expect(logOutputDestringified.level).toEqual(2);
    });

    it("must be 3 for a logger.warn() method call.", () => {
        logger.warn("test");
        expect(logOutputDestringified.level).toEqual(3);
    });

    it("must be 4 for a logger.error() method call.", () => {
        logger.error("test");
        expect(logOutputDestringified.level).toEqual(4);
    });

    it("must be 5 for a logger.fatal() method call.", () => {
        logger.fatal("test");
        expect(logOutputDestringified.level).toEqual(5);
    });
});

describe("The LogEvent.timestamp field:", () => {

    let logger = new Logger("my-logger", true)
        .setFormatter(new UnitTestFormatter())
        .addStream(unitTestStream);

    /* 
    There's a chance that the test could fail if the logger call happens at 
    timestamp 1598732101665.999 and the following Date.now() call happens at 
    1598732101666.000, so a substring of the most significant digits is taken 
    to at least prove it's the timestamp 
    
    Optionall use expect(logOutput.timestamp).toBeCloseTo(time, 0); ???
    */ 

    it("must be a valid UNIX timestamp at approximate time of call", () => {
        logger.info("test");
        let time = Date.now();

        expect(String(logOutputDestringified.timestamp).substring(0, 11))
            .toEqual(String(time).substring(0, 11));
        expect(String(logOutputDestringified.timestamp).length)
            .toEqual(String(time).length);
    });
});

describe("The LogEvent.message object:", () => {

    let logger = new Logger("my-logger", true)
        .setFormatter(new UnitTestFormatter())
        .addStream(unitTestStream);

    it("must have an undefined formatString for an empty logger call.", () => {
        logger.info();
        expect(logOutputDestringified.message.formatString).toBeUndefined();
    });

    it("must have empty args array for a logger call with one arg.", () => {
        logger.info("test");
        expect(logOutputDestringified.message.args).toEqual([]);
    });

    it("must have a string for formatString if a string is passed in.", () => {
        logger.info("test");
        expect(logOutputDestringified.message.formatString).toEqual("test");
    });

    it("must have a string for the args if a string is passed in.", () => {
        logger.info("test", "test2");
        expect(logOutputDestringified.message.args[0]).toEqual("test2");
    });

    it("must have an object as formatString if object is passed in.", () => {
        logger.info({ test: "value" });
        expect(logOutputDestringified.message.formatString)
            .toEqual({ test: "value" });
    });

    it("must have an object for the args if an object is passed in.", () => {
        logger.info({ test: "value" }, { test2: "value2" });
        expect(logOutputDestringified.message.args[0])
            .toEqual({ test2: "value2" });
    });

    it("must have an error as formatString if an error is passed in.", () => {
        let e = new Error("test");
        logger.info(e);
        
        // Errors don't appear in stringify, Actual LogEvent object is used
        expect(logOutputActual.message.formatString instanceof Error)
            .toEqual(true);
    });

    it("must have an error for the args if an error is passed in.", () => {
        let e = new Error("test");
        logger.info("1", e);
        // Errors don't appear in stringify, Actual LogEvent object is used
        expect(logOutputActual.message.args[0] instanceof Error).toEqual(true);
    });
});

describe("The LogEvent.properties object:", () => {

    let logger = new Logger("my-logger", true)
        .setFormatter(new UnitTestFormatter())
        .addStream(unitTestStream);

    it("must have an empty properties object for a new logger.", () => {
        logger.info();
        expect(logOutputDestringified.properties).toEqual({});
    });

    // Sequential tests (1/3)
    it("must add a key:str pair to properties when str val is added.", () => {
        logger.addLogProperty("test", "value");
        logger.info();
        expect(logOutputDestringified.properties).toEqual({ test: "value" });
    });

    // Sequential tests (2/3)
    it("must overwrite a key:val pair when an existing key is added.", () => {
        expect(logOutputDestringified.properties).toEqual({ test: "value" }); // Continuation of previous test...
        logger.addLogProperty("test", "value2");
        logger.info();
        expect(logOutputDestringified.properties).toEqual({ test: "value2" });
    });

    // Sequential tests (3/3)
    it("must remove a property by its associated key.", () => {
        expect(logOutputDestringified.properties).toEqual({ test: "value2" }); // Continuation of previous test...
        logger.removeLogProperty("test");
        logger.info();
        expect(logOutputDestringified.properties).toEqual({});
    });

    it("must add a key:obj pair to properties when obj val is added.", () => {
        logger.addLogProperty("test", { a: { b: { c: "d" } } });
        logger.info();
        expect(logOutputDestringified.properties).toEqual({ test: { a: { b: { c: "d" } } } });

        // Cleanup for next tests
        logger.removeLogProperty("test");
    });

    it("must add & remove a scoped property when using scope().", () => {
        // Before the scope is used, expect empty properties
        logger.info();
        expect(logOutputDestringified.properties).toEqual({});

        // Here the property scope should show a filled in property
        logger.scope("test", "value", () => {
            logger.info("scoped");
        });
        expect(logOutputDestringified.properties).toEqual({ test: "value" });

        // After the scope, expect empty properties again
        logger.info();
        expect(logOutputDestringified.properties).toEqual({});
    });

    it("must add & remove a scoped property when using asyncScope().", async () => {
        // Before the scope is used, expect empty properties
        logger.info();
        expect(logOutputDestringified.properties).toEqual({});

        // Here the property scope should show a filled in property. (await to run synchronously)
        await logger.asyncScope("test", "value", async () => {
            await 5;
            logger.info("scoped");
        });
        expect(logOutputDestringified.properties).toEqual({ test: "value" });

        // After the scope, expect empty properties again
        logger.info();
        expect(logOutputDestringified.properties).toEqual({});
    });
});


/* 
 * From here, the existence of the remainder of the log event properties are 
 * more of a logger behavior. This is tested in the LoggerBehavior test.
 */
