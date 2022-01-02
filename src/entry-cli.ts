import yargs from "yargs";
import { invokeAction } from "./actions";

import { getDefaultProjectConfig } from "./config";
import logger from "./logger";

/**
 * Cli actions entry point
 */
export function cli(argv: string[]) {
  (async () => {
    // Extract debug arguments as early as possibl
    const useDebug = argv.includes("-D") || argv.includes("--debug");
    const useVerboseDebug = argv.includes("-DD");
    if (useDebug || useVerboseDebug) {
      logger.level = "debug";
      if (useVerboseDebug) {
        logger.level = "silly";
      }
    }

    logger.silly(`Running eilos from ${__filename}`)

    // Load project configuration
    const config = getDefaultProjectConfig();
    if (useDebug || useVerboseDebug) {
      config.context.updateOptions({ debug: true });
    }
    config.context.updateOptions({ logLevel: logger.level });

    // Initialize CLI
    const cli = config.getActionNames().reduce(
      (cli, actionName) => {
        const action = config.getAction(actionName);
        logger.silly(`Registering action ${actionName}`);

        const positionalExpr =
          " " +
          Object.keys(action.arguments || {})
            .reduce((names, argName) => {
              const arg = action.arguments![argName];
              if (arg.positional) {
                names.push(`[${argName}]`);
              }
              return names;
            }, [] as string[])
            .join(" ");

        return cli.command(
          `${actionName}${positionalExpr.trim()}`,
          action.description ||
            `Runs the '${actionName}' action from the preset`,
          (yargs) => {
            // Process the positional arguments
            const args = Object.keys(action.arguments || {}).reduce(
              (yargs, argName) => {
                const arg = action.arguments![argName];
                if (arg.positional) {
                  logger.silly(
                    `Registering positional argument '${argName}' using config: ${JSON.stringify(
                      arg,
                      null,
                      2
                    )}`
                  );
                  return yargs.positional(argName, {
                    demandOption: arg.required,
                    describe: arg.description,
                    alias: arg.short,
                    type: arg.type || "string",
                  });
                } else {
                  logger.silly(
                    `Registering flag argument '${argName}' using config: ${JSON.stringify(
                      arg,
                      null,
                      2
                    )}`
                  );
                  return yargs.option(argName, {
                    demandOption: arg.required,
                    describe: arg.description,
                    alias: arg.short,
                    type: arg.type || "string",
                  });
                }
              },
              yargs
            );
            return args;
          },
          (argv) => {
            logger.silly(
              `Arguments passed down to context: ${JSON.stringify(argv, null)}`
            );

            // Pass down arguments to the context
            config.context.updateOptions({
              argv: argv._.slice(1).map(String),
              action: actionName,
            });
            config.context.updateArgs(argv);

            // Call-out to the profile action implementation
            logger.silly(`Context: ${JSON.stringify(config.context, null, 2)}`);
            invokeAction(config, actionName)
              .then((_) => {
                logger.info(`🏋️‍♀️  ${actionName} step completed`);
              })
              .catch((err) => {
                logger.error(`🏋️‍♀️  ${actionName} step failed: ${err}`);
                process.exit(1);
              });
          }
        );
      },
      yargs(argv)
        .scriptName("eilos")
        .env("EILOS")
        .usage("Usage: $0 <command> [options]")
        .demandCommand(1, "You must specify the command to run.")
        .alias("h", "help")
        .option("D", {
          desc: "Show debug output (use -DD for increased verbosity).",
          type: "boolean",
          default: false,
          alias: "debug",
        })
        .wrap(yargs.terminalWidth())
        .recommendCommands()
        .completion()
    );

    return cli.argv;
  })().catch((err) => {
    logger.error(`Critical error: ${err.message || err.toString()}`);
  });
}
