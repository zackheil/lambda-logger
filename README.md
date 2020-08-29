# Summary

Lambda-logger is a versatile logging class specialized for AWS Lambda’s NodeJS runtime. It is loosely inspired by the .NET logger Serilog with user-defined structured logging in mind, as well as the node-bunyan logger.

Please note that this is an incomplete readme file, so if you somehow have stumbled across this, just know it is still being worked on and will have more complete documentation in the future. In the meantime, the information below is documentation by demonstration and **a working example can be cloned from the example repository** [here](https://github.com/zackheil/lambda-logger-example)

### Install:

```sh
echo "@zackheil:registry=https://npm.pkg.github.com/" > .npmrc; 
#      ^ or add quoted text to .npmrc yourself
npm i @zackheil/lambda-logger
```

# Features

- Global log level assignment via the environment variable LOG_LEVEL.
- Serverless and Serverless-offline plugin support.
- Multiple output stream support separated by a “standard” output and an “error” output.
- A property object store to selectively add attributes to log messages.
- User-defined output formatters that can be minimalistic for high performance or verbose and complex for advanced process monitoring.
- A buffer of logs that keeps track of the first and last few logs for a particular AWS Request ID to pinpoint where errors occur and the inputs that were used to reproduce it.
- The ability to mask message contents with a hash for parameters that are deemed sensitive
- Typescript support.
- Absolute minimal overhead “off” mode.

# Basic Usage

Bare-bones usage: This creates a logger with a default level of 'info', does not collect a history of logs linked back to the AWS Request ID, and sends the info logs to `stdout` where 'warn', 'error', and 'fatal' go to `stderr`.

```js
import Logger from "@zackheil/lambda-logger";

const log = new Logger(); // Optionally name: Logger("MyLogger");
log.info("this is a log message");

// Supports formatting strings with templates
log.info("this %s a log %s", "is", "message");
```

## Setting Log Level

Building off of this, let's set a log level. A large portion of AWS deployments are using the Serverless framework. To set the log level globally for the entire application distribution, add the following parameter to the `serverless.yml` file. _If not using Serverless or a CloudFormation type service, go into each Lambda that utilizes the logger and add an environment variable to the function using the function's configuration and settings page_.

```yml
# <log level> = trace | debug | info | warn | error | fatal | off
provider:
  environment:
    LOG_LEVEL: <log level>
```

## Creating a Log Buffer

If you would like to sacrifice a small bit of performance for the sake of increased error debugging, the logger looks to see if a value is set for the environment variable `process.env.AWS_REQUEST_ID` and will keep track of the first five logs and the most recent 5 logs for a given request identifier. These stored logs will be echoed back to you for any 'warn', 'error', or 'fatal' message that the program comes across. To enable the functionality, set the process variable at the beginning of your handler:

```js
const log = new Logger();

export async thisIsMyAwsHandler(event, context) {
    process.env.AWS_REQUEST_ID = context.awsRequestId; // enables log tracking

    // example use case with level set to info
    log.trace("Here I would log the event object");
    log.debug("Here I might call out some important variables");
    log.info("Here I might determine where the execution is going");
    log.trace("Another log related to execution 1");
    log.info("Another log related to execution 2");

    log.info("You won't see this message in the buffer of logs because it is after the first 5 and before the last 5 logs... (3) ");
    log.info("This one either... (4) ");

    log.trace("Another log related to execution 5");
    log.debug("Another log related to execution 6");
    log.debug("Another log related to execution 7");
    log.info("Another log related to execution 8");
    log.info("Another log related to execution 9");

    log.error("Hmm... seems we hit an error later in the program... If only I knew what inputs could quickly recreate this behavior without having to enable trace and hoping it happens again...");

    return {/* {...} */}
}
```

Example output:

```text
[1597686168658 - INFO]: Here I might determine where the execution is going
[1597686168658 - INFO]: Another log related to execution 2
[1597686168658 - INFO]: You won't see this message in the buffer of logs because it is after the first 5 and before the last 5 logs... (3)
[1597686168658 - INFO]: This one either... (4)
[1597686168658 - INFO]: Another log related to execution 8
[1597686168658 - INFO]: Another log related to execution 9
[1597686168658 - ERROR]: Hmm... seems we hit an error later in the program... If only I knew what inputs could quickly recreate this behavior without having to enable trace and hoping it happens again...
        ERROR: Printing the first and last 5 log message to aid in issue reproduction:
        LOG #1: [TRACE]: Here I would log the event object
        LOG #2: [DEBUG]: Here I might call out some important variables
        LOG #3: [INFO]: Here I might determine where the execution is going
        LOG #4: [TRACE]: Another log related to execution 1
        LOG #5: [INFO]: Another log related to execution 2
        [... 2 more messages ...]
        LOG #8: [TRACE]: Another log related to execution 5
        LOG #9: [DEBUG]: Another log related to execution 6
        LOG #10: [DEBUG]: Another log related to execution 7
        LOG #11: [INFO]: Another log related to execution 8
        LOG #12: [INFO]: Another log related to execution 9
```

Notice in the above console output that output logs are set to the level 'info' or higher, but in the case that the buffer is dumped, you have access to all levels of logs and can see the trace and debug messages that would otherwise be hidden.

## Structuring Logs

By default, the logs are written in a basic line structure. This can be changed by setting a formatter at time of construction. You can either use the pre-installed formatters, or create your own with the supplied Typescript definitions.

### Using a Pre-installed Formatter

```js
import Logger, { JSONFormatter } from "@zackheil/lambda-logger";
const log = new Logger().setFormatter(new JSONFormatter());
export async thisIsMyAwsHandler(event, context) {
    process.env.AWS_REQUEST_ID = context.awsRequestId; // enables log tracking
    log.info("this log will be formatted in JSON");
    return{/* (...) */}
}

/*
This will log a pretty-printed json to stdout locally (via serverless-offline),
and a compact one on AWS:

{
  "Timestamp":"1597686887997",
  "Level":"INFO",
  "Message":"this log will be formatted in JSON",
  "MessageHash":"052B46F2",
  "RequestId":"ckdytisl100023zybbddl9ubm",
  "LogCount":"1"
}

*/
```

### Creating a Custom Formatter

To create a custom formatter, reference the existing formatters in the source code for examples and inspiration and utilize the types: `LogEvent`, `LogFormatterStructure`, and `Stream`. [Example line format code](https://github.com/zackheil/lambda-logger/blob/master/src/formatters/LinearFormatter.ts)

# Adding/Editing Streams

By default, the logger will default to `stdout`/`stderr` as mentioned above, but if you want to add a custom output location, you can using the `addStream(stream: Stream)` method off of the constructor. This _appends_ the log stream you add to the existing stream of `stdout`/`stderr`. If you would like to remove the default `stdout`/`stderr` stream, use the second arg of the Logger constructor (override stdout) set to `true` :

```js
const log1 = new Logger("MyBrokenLogger", true);
log1.info("message"); // will error as no output is now defined.

// Create a custom stream defined by the "Stream" type
myCustomStream = {
  name: "my stream",
  outputStream: fs.createWriteStream("program.log"),
  errorStream: fs.createWriteStream("program_errors.log"),
  // you can make errorStream the same as outputStream for unified logs
};
const log2 = new Logger("MyWorkingLogger", true).addStream(myCustomStream);
log2.info("message"); // will be written to program.log
log2.error("error"); // will be written to program_errors.log
```

# Future Work

One major thing that I will be focusing on next with this code base is performance. As of right now, the speed of this logger is comparable to node-bunyan, but this cam be improved. I originally wrote this logger in TS just to organize my thoughts. Now that I have the basis for the functionality, I'll go back and re-write the code using JS with speed in mind. This means benchmarking several ways do one operation in code to determine the fastest way to perform the task.

Take the buffer of logs as an example. The first five logs are simple variable assignments that don't change, but the last 5 logs are constantly changing throughout execution. There are several ways to go about storing a constant stream of the last 5 logs, each with varying performance considerations. The below code is an example of how to shift variables around to store the last 5 values wrapped in a for loop so it could have a chance to run a few full cycles in a benchmarking setup:

```js
// Setup code used
let a = new Array();
let c = new Array();
let count = 0;
let b1 = 0;
let b2 = 0;
let b3 = 0;
let b4 = 0;
let b5 = 0;

// Method 1, 5.980M operations/sec (current implementation; 83.43% slower than method 3)
for (let i = 0; i < 20; i++) {
    if (a.length >= 5) {
        a.shift();
    }
    a.push(i);
}

// Method 2, 30.181M operations/sec (FIFO cache in Array; 16.4% slower than method 3)
for (let i = 0; i < 20; i++) {
    c[count] = i;
    if (count === 4) {
        count = 0;
    } else {
        count++;
    }
}

// Method 3, 36.103M operations/sec (FIFO cache with vars (if); fastest)
for(let i = 0; i < 20; i++) {
	count++;
	if(count === 1) { b1 = i;}
	else if(count === 2) { b2 = i;}
	else if(count === 3) { b3 = i;}
	else if(count === 4) { b4 = i;}
	else if(count === 5) { b5 = i; count = 0;}
}

// Method 4, 23.213M operations/sec (FIFO cache with vars (switch) ; 39.13% slower)
for(let i = 0; i < 20; i++) {
	switch(count) {
		case 0:b1 = i; count++; break;
		case 1:b2 = i; count++; break;
		case 2:b3 = i; count++; break;
		case 3:b4 = i; count++; break;
		default:b5 = i; count = 0; break;	
	}
}
```

### Misc work:

- finish this readme to read more like documentation with a TOC
- (no feature change) The speed changes detailed above
- (no feature change) Modify the buffer to save resources (store the log method args, not events)
- (no feature change) unit testing
- (minor feature change) more variety in pre-installed loggers
- (no feature change) adding some of the hi-perf packages and features of the Pino logger
