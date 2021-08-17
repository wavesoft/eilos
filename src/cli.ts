import { getDefaultProjectConfig } from "./config";
import logger from "./logger";

/**
 * Cli actions entry point
 */
export async function cli(argv: string[]): Promise<void> {
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
}
