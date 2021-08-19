import type { PresetActions } from "./Preset";

/**
 * Describes the configuration that the user can provide to eilos
 * via .eilos.js or via "eilos" property in package.json
 */
export interface BaseUserConfig {
  /**
   * Specifies the eilos preset to use
   *
   * By default, the first `eilos-preset-*` package found in the dependencies
   * will be used, but you can use this option to tune this accordingly.
   */
  eilosPreset?: string;

  /**
   * One or more custom actions, implemented locally by the package
   * definition. (Not recommended, but allowed)
   */
  eilosActions?: PresetActions;
}

export type SomeUserConfig = BaseUserConfig & {
  /**
   * (Additional variables may be present and they are strongly
   *  typed when defining the preset configuration. Refer to the
   *  `RuntimeConfig` definition that holds them).
   */
  [K: string]: any;
};
