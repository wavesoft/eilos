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

    // Load project configuration
    const config = getDefaultProjectConfig();
    if (useDebug) {
      config.context.updateConfig({ debug: true });
    }

    // Initialize CLI
    const cli = config.getActions().reduce(
      (cli, action) => {
        logger.debug(`Registering action ${action.name}`);

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
          `${action.name}${positionalExpr.trim()}`,
          action.description ||
            `Runs the '${action.name}' action from the preset`,
          (yargs) => {
            // Process the positional arguments
            const args = Object.keys(action.arguments || {}).reduce(
              (yargs, argName) => {
                const arg = action.arguments![argName];
                if (arg.positional) {
                  return yargs.positional(argName, {
                    demandOption: arg.required,
                    describe: arg.description,
                    alias: arg.short,
                    type: arg.type || "string",
                  });
                } else {
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
            // Pass down arguments to the context
            config.context.updateConfig({ argv: argv._.slice(1).map(String) });
            config.context.updateArgs(argv);

            // Call-out to the profile action implementation
            invokeAction(config, action.name)
              .then((_) => {
                logger.info(`🏋️‍♀️  ${action.name} step completed`);
              })
              .catch((err) => {
                logger.error(`🏋️‍♀️  ${action.name} step failed: ${err}`);
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
