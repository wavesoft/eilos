import yargs from "yargs";
import { invokeAction } from "./actions";

import { getDefaultProjectConfig } from "./config";
import logger from "./logger";

/**
 * Cli actions entry point
 */
export function cli(argv: string[]) {
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
        const args1 = (action.arguments?.positional || []).reduce(
          (yargs, posArg) => {
            return yargs.positional(posArg.name, {
              demandOption: posArg.required,
              describe: posArg.description,
              type: posArg.type || "string",
            });
          },
          yargs
        );

        // Process the named arguments
        const args2 = (action.arguments?.named || []).reduce(
          (yargs, posArg) => {
            return yargs.positional(posArg.name, {
              alias: posArg.short,
              demandOption: posArg.required,
              describe: posArg.description,
              type: posArg.type || "string",
              default: posArg.defaultValue,
            });
          },
          args1
        );

        // Process the flags
        const args3 = (action.arguments?.flag || []).reduce((yargs, posArg) => {
          return yargs.option(posArg.name, {
            alias: posArg.short,
            default: false,
            describe: posArg.description,
          });
        }, args2);

        return args3;
      },
      handler: (argv) => {
        // Pass down arguments to the context
        config.context.updateConfig({ argv: argv._.slice(1) });

        // Call-out to the profile action implementation
        invokeAction(config, action.name, argv)
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
}
