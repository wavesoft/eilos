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
    if (useDebug) {
      logger.level = "debug";
    }

    // Load project configuration
    const config = getDefaultProjectConfig();
    if (useDebug) {
      config.context.updateConfig({ debug: true });
    }

    // Initialize CLI
    const cli = yargs(argv)
      .scriptName("eilos")
      .env("EILOS")
      .example(
        "$0 build",
        "Runs the build command to bundle JS code for the browser."
      )
      .usage("Usage: $0 <command> [options]")
      .demandCommand(1, "You must specify the command to run.")
      .alias("h", "help")
      .option("D", {
        desc: "Show debug output.",
        type: "boolean",
        default: false,
        alias: "debug",
      })
      .wrap(yargs.terminalWidth())
      .recommendCommands()
      .completion();

    const cliWithCommands = config.getActions().reduce((cli, action) => {
      return cli.command({
        command: action.name,
        builder: (yargs) => {
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
        handler: (argv) => {
          // Pass down arguments to the context
          config.context.updateConfig({ argv: argv._.slice(1) });
          config.context.updateArgs(argv);

          // Call-out to the profile action implementation
          invokeAction(config, action.name)
            .then((_) => {
              logger.info(`🏋️‍♀️ ${action.name} step completed`);
            })
            .catch((err) => {
              logger.error(`🏋️‍♀️ ${action.name} step failed: ${err}`);
              process.exit(1);
            });
        },
      });
    }, cli);

    return cliWithCommands.argv;
  })().catch((err) => {
    logger.error(`Critical error: ${err.message || err.toString()}`);
  });
}
