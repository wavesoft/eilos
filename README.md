# 🏋️‍♂️ εἵλως (eilos)

> The hard working, opinionated build toolset for javascript applications, with pluggable opinions

`eilos` makes it easy to use and maintain the lifecycle operations of your node project while keeping the amount of dependencies and configuration you need to a minimum.

It is heavily inspired by [aegir](https://github.com/ipfs/aegir), but is focused more on the versatility of the "opinitions" rather than forcing a specific paradigm to the user.


## Usage

Right after you have configured your node module, do the following:

1. Add `eilos` to your dependencies:

  ```
  yarn add -D eilos
  ```

2. Add an eilos preset you like to your dependencies:

  ```
  yarn add -D eilos-preset-typescript
  ```

3. Use `eilos` for every life-cycle script on your project:

  ```json
  {
    "scripts": {
      "build": "eilos build",
      "dev": "eilos dev",
      "test": "eilos test",
      "lint": "eilos lint",
    }
  }
  ```

## Configuration

`eilos` aims to minimise the amount of configuration required by assuming some deafults.

The base package has no configuration options. They are all provided by the preset you are using. 

For example, when using the `eilos-preset-typescript` preset:

* The default entry point is `src/index.ts`
* The default static files directory is `static/`
* The default build directory is `build/`

You can override these defaults by providing a `.eilos.js` configuration file:

```js
/** @typedef { import('eilos-preset-typescript').UserConfig } UserConfig */

/**
 * @type {UserConfig}
 */
module.exports = {
  // Define the entry point
  entry: "src/index.js",
  // Define thestatic files
  staticSrcDir: "static",

  // Manually override specific configuration options for the packages used
  // by the profile (refer to the profile documentation)

  webpack: {
    // Webbpack options
  },
  typescript: {
    // Typescript compiler options
  },
  jest: {
    // Jest options
  },
  prettier: {
    // Prettier options
  }
}
```

## Preset Development

Refer to the [Preset Development Tutorial](./docs/Preset%20Development.md) to learn how to define your own preset.