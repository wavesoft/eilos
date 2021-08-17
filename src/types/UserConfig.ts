import { Action } from "./Action";

/**
 * Describes the configuration that the user can provide to eilos
 * via .eilos.js or via "eilos" property in package.json
 */
export interface UserConfig {
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
  eilosActions?: Action[];

  /**
   * Every other property in the object are considered values to
   * various options exposed by the preset.
   */
  [key: string]: any;
}
