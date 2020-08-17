### Summary

Lambda-logger is a versatile logging class specialized for AWS Lambda’s NodeJS runtime. It is loosely inspired by the .NET logger Serilog with user-defined structured logging in mind.

Please note that this is an incomplete readme file, so if you somehow have stumbled across this, just know it is still being worked on and will have more complete documentation in the future.

### Table of Contents

_coming soon_

- Features
- Basic Usage
- Log Levels
- Output Streams
- Formatter Objects
- Suggestions for Best Performance

### Features

### Basic Usage

Bare-bones usage: This creates a logger with a default level of 'info', does not collect a history of logs linked back to the AWS Request ID, and sends the info logs to `stdout` where 'warn', 'error', and 'fatal' to `stderr`.

```js
import Logger from "@zackheil/lambda-logger";
const log = new Logger();
log.info("this is a log message");
```

Building off of this, let's set a log level. A large portion of AWS deployments are using the Serverless framework. To set the log level globally for the entire application distribution, add the following parameter to the `serverless.yml` file. _If not using serverless or a CloudFormation type service, go into each Lmabda that utilizes the logger and add an environment variable to the function using the function's configuration and settings page_.

```yml
# <log level> = trace | debug | info | warn | error | fatal | off
provider:
  environment:
    LOG_LEVEL: <log level>
```

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
