import type { Action } from "../types/Action";
import type { ConfigFile } from "../types";
import type { Preset } from "../types/Preset";
import type { PresetOptions } from "../types/PresetOption";
import type { PresetRuntimeConfig } from "../types/RuntimeConfig";
import type { RuntimeContext } from "./RuntimeContext";
import type { SomeUserConfig } from "../types/UserConfig";

import { mergeFiles } from "../utils/DefinitionUtil";
import loggerBase from "../logger";

const logger = loggerBase.child({ component: "project" });

/**
 * Helper to aggregate all project configuration
 */
export class ProjectConfig {
  readonly context: RuntimeContext;
  private preset: Preset;

  constructor(preset: Preset, context: RuntimeContext) {
    this.context = context;
    this.preset = preset;
  }

  getRuntime<O extends PresetOptions>(
    user: SomeUserConfig
  ): PresetRuntimeConfig<O> {
    const ret: any = {};

    // Process the options from the preset
    if (this.preset.config.options) {
      Object.keys(this.preset.config.options).forEach((key) => {
        const opt = this.preset.config.options![key];
        const userValue = user[key];
        if (userValue == null) {
          if (opt.defaultValue != null) {
            ret[key] = opt.defaultValue;
          }
        } else {
          ret[key] = userValue;
        }
      });
    }

    return ret;
  }

  getActionNames(): string[] {
    return Object.keys(this.preset.actions || {});
  }

  /**
   * Returns the action definition by name
   * @param name the name of the action
   * @returns returns the action definition
   */
  getAction(name: string): Action {
    const action = (this.preset.actions as Record<string, Action>)[name];
    if (!action) {
      throw new Error(`Could not find action "${name}" in the preset`);
    }
    return action;
  }

  /**
   * Return the config file
   * @param fileName
   * @param actionName
   */
  getFile(fileName: string, actionName?: string): ConfigFile<any, any> {
    const baseFile = this.preset.config.files?.[fileName];
    const actionFile = actionName
      ? (this.preset.actions?.[actionName].files as any)?.[fileName]
      : undefined;

    if (baseFile && actionFile) {
      return mergeFiles(fileName, baseFile, actionFile);
    } else if (baseFile) {
      return baseFile;
    } else if (actionFile) {
      return actionFile;
    }

    throw new TypeError(
      `Could not find definitions of the configuration file '${fileName}'`
    );
  }

  /**
   * Returns the definitions for all the files needed by the specific action
   * @param action the action to analyze
   */
  getActionFiles(action: string): Record<string, ConfigFile<any, any>> {
    const ret: Record<string, ConfigFile<any, any>> = {};
    const baseFiles = this.preset.config.files || {};
    const actionFiles = this.preset.actions?.[action]?.files || {};
    const useFiles = this.preset.actions?.[action]?.useFiles || [];

    // Include used files from the global context
    for (const fileName of useFiles) {
      const f = baseFiles[fileName];
      logger.silly(
        `Using global config file '${fileName}' for action '${action}'`
      );
      if (!f) {
        throw new TypeError(
          `Configuration file '${fileName}' is required by the '${action}' action, ` +
            `but it's not defined in the preset configuration`
        );
      }
      ret[fileName] = f;
    }

    // Include all the files defined in action files
    for (const fileName in actionFiles) {
      const f = (actionFiles as any)[fileName];

      // If this file also exists on base, merge them
      const bf = baseFiles[fileName];
      if (bf) {
        logger.silly(
          `Using merged global+action-local config file '${fileName}' for action '${action}'`
        );
        ret[fileName] = mergeFiles(fileName, bf, f);
      } else {
        logger.silly(
          `Using action-local config file '${fileName}' for action '${action}'`
        );
        ret[fileName] = f;
      }
    }

    return ret;
  }
}
