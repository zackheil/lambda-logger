# Summary

Lambda-logger is a versatile logging class specialized for AWS Lambda’s NodeJS runtime. It is loosely inspired by the .NET logger Serilog with user-defined structured logging in mind.

Please note that this is an incomplete readme file, so if you somehow have stumbled across this, just know it is still being worked on and will have more complete documentation in the future.

### Install:

```sh
echo "@zackheil:registry=https://npm.pkg.github.com/" > .npmrc; #or add quoted text to .npmrc yourself
npm i @zackheil/lambda-logger
```

# Table of Contents

_coming soon_

- Features
- Basic Usage
- Log Levels
- Output Streams
- Formatter Objects
- Suggestions for Best Performance

# Features

_coming soon... keep scrolling for usage_

# Basic Usage

Bare-bones usage: This creates a logger with a default level of 'info', does not collect a history of logs linked back to the AWS Request ID, and sends the info logs to `stdout` where 'warn', 'error', and 'fatal' to `stderr`.

```js
import Logger from "@zackheil/lambda-logger";
const log = new Logger(); // You can optionally set a name with Logger("This is my name");
log.info("this is a log message");
```

## Setting Log Level

Building off of this, let's set a log level. A large portion of AWS deployments are using the Serverless framework. To set the log level globally for the entire application distribution, add the following parameter to the `serverless.yml` file. _If not using serverless or a CloudFormation type service, go into each Lmabda that utilizes the logger and add an environment variable to the function using the function's configuration and settings page_.

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

## Structuring Logs

By default, the logs are written in a basic, linear structure. This can be changed by setting a formatter at time of construction. You can either use the preinstalled formatters, or create your own with Typescript.

### Using a Preinstalled Formatter

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

To create a custom formatter, reference the existing formatters in the source code for examples and inspiration and utilize the types: `LogEvent`, `LogFormatterStructure`, and `Stream`.

# Adding/Editing Streams

By default, the logger will default to `stdout`/`stderr` as mentioned above, but if you want to add a custom output location, you can using the `addStream(stream: Stream)` method off of the constructor. This _appends_ the log stream you add to the existing stream of `stdout`/`stderr`. If you would like to remove the default `stdout`/`stderr` stream, use the second arg of the Logger constructor (override stdout) set to `true` :

```js
const log1 = new Logger("MyLogger", true);
log1.info("message"); // will error as no output is now defined.

// Create a custom stream defined by the "Stream" type
myCustomStream = {
  name: "my stream",
  outputStream: fs.createWriteStream("program.log"),
  errorStream: fs.createWriteStream("program_errors.log"),
  // you can make errorStream the same to have a unified log location
};
const log2 = new Logger("MyWorkingLogger", true).addStream(myCustomStream);
log2.info("message"); // will be written to program.log
log2.error("error"); // will be written to program_errors.log
```
