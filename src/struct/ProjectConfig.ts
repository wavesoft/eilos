import type { Action } from "../types/Action";
import type { ConfigFile } from "../types";
import type { Preset } from "../types/Preset";
import type { PresetOptions } from "../types/PresetOption";
import type { PresetRuntimeConfig } from "../types/RuntimeConfig";
import type { RuntimeContext } from "./RuntimeContext";
import type { UserConfig } from "../types/UserConfig";

import { mergeFiles } from "../utils/DefinitionUtil";

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
    user: UserConfig
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

  getActions(): (Action & { name: string })[] {
    return Object.keys(this.preset.actions || {}).map((key) => {
      return {
        ...this.preset.actions![key],
        name: key,
      };
    });
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
   * Returns the definitions for all the files in the project
   *
   * If we know the function to be executed, this
   *
   * @param action the action to execute
   */
  getAllFiles(action?: string): Record<string, ConfigFile<any, any>> {
    const baseFiles = this.preset.actions;
    const actionFiles = action
      ? this.preset.actions?.[action]?.files
      : undefined;
    const ret: Record<string, ConfigFile<any, any>> = {};

    // Set base files
    if (baseFiles) {
      Object.assign(ret, baseFiles);
    }

    // Override/merge with action files
    if (actionFiles) {
      for (const fileName in actionFiles) {
        const baseFile = ret[fileName];
        const actionFile = (actionFiles as any)[fileName];
        if (baseFile) {
          ret[fileName] = mergeFiles(fileName, baseFile, actionFile);
        } else {
          ret[fileName] = actionFile;
        }
      }
    }

    return ret;
  }
}
