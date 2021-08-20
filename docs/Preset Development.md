# Preset Development

As you may have read on the project description, `eilos` is nothing more than an opinionated runner that executes pre-defined 'opinions' that are called 'presets'.

Practically, this means that your build logic lives inside an eilos preset.

A preset consists of:

* One or more _Actions_ that the user can invoke
* One or more _Configuration Options_ that the user can tune to modify the behaviour of the actions.
* One or more _Files_ that the actions will generate in order to perform the operation they are designed to deliver.

# 1. Introduction

## 1.1. Naming Conventions

All eilos presets must be published under the name `eilos-preset-xxxxx`.

This is required because eilos automatically scans for presets found in the current project using the above prefix.

## 1.2. Directory Layout

A typical preset directory layout is the following:

```
.
├── README.md
├── dist
├── src
│   ├── actions
│   │   └── some_action.ts
│   ├── files
│   │   └── some_file.ts
│   ├── config.ts
│   ├── index.ts
│   └── options.ts
├── package.json
├── tsconfig.json
├── webpack.config.js
└── yarn.lock
```

Where:

* `dist` holds the built artifacts
* `src` holds the preset sources
* `src/actions` holds the action definitions
* `src/files` holds the configuration file definitions
* `src/index.ts` is the entry point
* `src/options.ts` defines the user-tunable options
* `src/config.ts` defines the overall preset configuration

---

# 2. Tutorial

You can learn more about the presets following this tutorial.

## 2.1. Create an empty project

> For a quick start, you can start by cloning the default preset repository:
> 
> ```
> git clone --depth 1 https://github.com/wavesoft/eilos-preset-template  eilos-preset-mypreset
> ```
>

Alternatively you can follow the steps:

### 2.1.1. Start an Empty Project

Create an empty project using `yarn init`

### 2.1.2. Install Required Dependencies

Run the following command to install the basic dependencies:

```
yarn add -D \
  eilos \
  ts-loader \
  typescript \
  webpack \
  webpack-cli

```

### 2.1.3. Create the webpack config file

We are using webpack to build and bundle out typescript project into a commonjs library.

Therefore we need  to create a `webpack.config.js` with the following contents:

```js
const path = require("path");
const isDevel = process.env.NODE_ENV === "development";

// Consider ALL of the packages in 'dependencies' as externals 
// and therefore never include them in the produced bundle.
const deps = require("./package.json");
const externals = Object.keys(deps.dependencies).reduce(
  (externals, pkg) => {
    externals[pkg] = `commonjs2 ${pkg}`;
    return externals;
  },
  {
    // Also externalize 'eilos'
    eilos: `commonjs2 eilos`,
  }
);

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  devtool: isDevel ? "source-map" : false,
  mode: isDevel ? "development" : "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      // TODO: Modify this to fit match your project name
      name: "eilos-preset-typescript",
      type: "umd",
    },
  },
  externals,
};
```

### 2.1.3. Create the typescript config file

And a `tsconfig.json` that with the following contents:

```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "target": "es5",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "noEmit": false,
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["es2019"]
  }
}
```

### 2.1.4. Create our entry point

Create an empty file on `src/index.ts` that will be our entry point.

---

## 2.2. Define your preset options

Before we move forward we must first define the global preset options.

These options are available for the user to tweak and are used throughout the preset.

Start by creating a file in `src/options.ts` were we are going to define all options using the `DefinePresetOptions` helper like so:

```ts
export const Options = DefinePresetOptions({
  /**
   * The property names are the object keys
   */
  entryPoint: {
    // (All these fields are optional)

    /**
     * Provide a verbose description for this option
     */
    description: "Option 1 is ...",

    /**
     * Provide a default value to use when the argument is missing
     */
    defaultValue: "./src/index.ts",
   
    /**
     * Indicates that the option is required
     */
    required: true;

    /**
     * If specified, the option is considered deprecated and a warning
     * message is shown to the user
     */
    deprecated: "This argument should not be used",

    /**
     * A JSON Type Definition (JTD) schema to use for validating
     * the user input.
     * 
     * Reference:
     * https://ajv.js.org/json-type-definition.html#jtd-schema-forms
     */
    schema: {
      type: "string";
    },

    /**
     * Note that if you want to express a union of types you can use
     * an array instead of a single expression:
     */
    schema: [
      { type: "string" },
      { type: "number" }
    ]

  },

  // ...
});
```

> 💡  For the full reference check the [PresetOption](https://github.com/wavesoft/eilos/blob/master/src/types/PresetOption.ts#L6) type definition.

It is also a good idea to export the type definition of the global runtime context. This can be used as a type annotation on the content generators in the functions:

```ts
export type GlobalRuntimeContext = PresetOptionsRuntimeContext<typeof Options>;
```

---

## 2.3. Define one or more preset files

Once the options are defined you can start creating files that are used by your preset.

Typically these are configuration files that will be later passed as arguments to the commands you are going to invoke through thea actions.

Each preset file is typically placed in the `src/files` directory and similar to the configuration options, we can use the `DefinePresetFile` helper to define them.

For example, let's create a definition for webpack in `src/files/webpack.config.ts`:

```ts
import { DefinePresetFile } from "eilos";

// Import the options we defined in the previous step
import { Options } from "../options";

// Create the file contents
const file = DefinePresetFile(Options, {
  /**
   * It is important to define the mime type for this file in order to
   * help the engine figure out what kind of contents to create
   */
  mimeType: "application/json",

  /**
   * You can (1) either specify the file contents as a constant
   */
  contents: {
    entry: "./src/index.ts",
    output: {
      filename: "index.js",
      path: "./dist"
    },
  }

  /**
   * Or you can (2) use a generator function that can compose
   * the contents of this file dynamically
   */
  generator: (ctx) => {
    const entryPoint = ctx.getOption("entryPoint");

    // The 'webpack.config.js' contents
    const Contents = {
      entry: entryPoint,
      output: {
        filename: "index.js",
        path: "./dist"
      },
    };

    return return Contents;
  },
});

// Export the file
export default file;
```

> 💡  For the full reference check the [ConfigFile](https://github.com/wavesoft/eilos/blob/master/src/types/ConfigFile.ts#L40) type definition.

### 2.3.1 Creating Plaintext Files

By default, if no mime type is specified, the engine is creating plaintext files.

This means that even if you use some javascript structure as the contents of the file, it will be first converted to string using `toString()`

```ts
{
  mimeType: "text/plain",
  generator: (ctx) => {
    // Any valid text
    return `[config]\nentryPoint=${ctx.getOption("entryPoint")}`;
  }
}
```

### 2.3.2 Creating JSON files

When you are using the `application/json` MIME type, the engine will produce a valid JSON string even when you are defining the contents of the file as a javascript object.

```ts
{
  mimeType: "application/json",
  generator: (ctx) => {
    return {
      // Any valid JSON definition
      entry: ctx.getOption("entryPoint")
    }
  }
}
```

### 2.3.3 Creating JS files

When you are using the `application/javascript` MIME type **AND** you are using a generator function to create the file contents, then a proxy `.js` file will be created that will call-out to your generation function when that javascript file is sourced.

```ts
{
  mimeType: "application/javascript",
  generator: (ctx) => {
    // This function is evaluated when the user sources the generated file.
    // Since this is executed in a javascript context, you can return anything
    // as your file contents (even references to JS objects)

    return {
      // You can even return class instances
      plugins: [
        new CopyWebpackPlugin({
          patterns: [{ from: staticDir }],
        })
      ]
    }
  }
}
```


---

## 2.4. Define your preset configuration

Once the options and the files are specified, you can now create your preset _Configuration_. This is a composite type that holds the options and the files and can be used to:

1. Strongly type your action definitions.
2. Provide the base line for later extending this preset.

Create the file `src/config.ts` with the following contents:

```ts
import {
  DefinePresetConfig,
  PresetRuntimeContext as TPresetRuntimeContext,
} from "eilos";

// Import the options defined previously
import { Options } from "./options";

// Import your files defined previously
import webpackConfigFile from "./files/webpack.config";
// ...

/**
 * Complete preset configuration that is used by the actions
 * or by other implementations.
 */
export const Config = DefinePresetConfig({
  options: Options,
  files: {
    "webpack.config.js": webpackConfigFile,
    // ...
  },
});

/**
 * Extract the preset's runtime context
 */
export type PresetRuntimeContext = TPresetRuntimeContext<typeof Config>;
```

---

## 2.5. Define your preset actions

Once the preset configuration is ready you can start creating your actions.

For example, let's create `./src/actions/build.ts`. Just like before, you can use the `DefineAction` helper to create your action file.

```ts
import { DefineAction } from "eilos";

// Import the configuration we created in the previous step
import { Config } from "../config";

const Action = DefineAction(Config, {
  /**
   * Specify which files are needed by this action and should be emitted
   */
  useFiles: ["webpack.config.js"],

  /**
   * Implement the run handler
   */
  run: (ctx) => {
    const cfgFile = ctx.getConfigFilePath("webpack.config.js");
    const argv = ctx.getOption("argv", []);

    // You can use the `ctx.exec` helper to promisify the invocation
    // of a process. Check the 'execa' reference for details:
    // https://www.npmjs.com/package/execa/v/4.0.1
    return ctx.exec(
      "webpack",
      ([] as string[]).concat(["--config", cfgFile], argv)
    );
  },
});

export default Action;
```

> 💡  For the full reference check the [Action](https://github.com/wavesoft/eilos/blob/master/src/types/Action.ts#L32) type definition.

---

## 2.6. Define your preset entry point

Once all the files, actions and options are specified you can now create your preset entry point:

Create `src/index.ts` with the following contents:

```ts
import { DefinePreset, PresetUserConfig } from "eilos";

// Import the preset configuration
import { Config } from "./config";

// Import the preset actions
import buildAction from "./actions/build";
// ...

/**
 * Eilos preset configuration
 */
const Preset = DefinePreset({
  // Specify the minimum eilos engine version required
  engineVersion: "1.0.0",
  config: Config,
  actions: {
    build: buildAction,
    // ...
  },
});


// In order to enable extending this preset it's recommended
// to always export your `Config` definition
export { Config } from "./config";

// In order to enable type hinting when the user is creating
// his `.eilos.js` file, it's recommended to always export
// a type definition named 'UserConfig' with the shape
// of the configuration.
export type UserConfig = PresetUserConfig<typeof Config>

// You must export the preset as the default export
export default Preset;
```

---

## 2.7. Building the preset

Finally we can modify our `package.json` to build and publish our preset:

1. Make sure that the entry point and the type definitions point at the `dist/` directory:

    ```json
    {
      // ...
      "main": "dist/index.js",
      "types": "dist/index.d.ts",
      // ...
    }
    ```

2. Make sure you are publishing only the files you are interested in:

    ```json
    {
      // ...
      "files": [
        "dist/**/*.js",
        "dist/**/*.ts",
        "bin/*",
        "package.json",
        "README.md"
      ],
      // ...
    }
    ```

3. Make sure you are using the `eilos` and the `eilos-preset` tags:

    ```json
    {
      // ...
      "tags": [
        "eilos",
        "eilos-preset"
      ],
      // ...
    }
    ```

4. Create a `build` and a `prepack` script:

    ```json
    {
      // ...
      "scripts": {
        "build": "NODE_ENV=development webpack",
        "prepack": "NODE_ENV=production webpack"
      }
      // ...
    }
    ```

You can now build a development version of your preset by doing:

```
yarn build
```

When you are about to publish your preset on `npm`, it will now automatically build th production version of your build.

---

# 3. Extending Presets

`eilos` is designed in a way to allow simple extension of an existing preset.

When extending a preset you should follow the same process as the one described above. However this time you must specify the base components you want to override.

## 3.1. Create an Extended Config

Before you can do anything else you must create your own extension of the preset configuration.

To do so, you must first import the configuration of the preset you are extended. This means in your `src/config.ts` you must do:

```ts
// ...

// (1) Import the config from preset you are extending
import { Config } from "eilos-preset-typescript";

// (2) Modify the `DefinePresetConfig` to extend from this config
export const Config = DefinePresetConfig(Config, {
  // ...
});
```

## 3.2. Provide File Overrides

When the same file is defined in both presets, `eilos` will try to combine them and if not possible it will just use the overriden version of the file.

To customize this behaviour you can specify the `combine` strategy. For example in your overriden `src/webpack.config.ts`

```ts
const file = DefinePresetFile(Options, {
  // (1) Specify the strategy to use when combining:
  //     - `concat` will append text blobs and merge JSON definitions
  //     - `replace` will keep only the new contents 
  combine: "concat",

  // ...
});
```

### 3.2.1. Advanced File Overrides

If you want full control over the merge process you can use a generator in addition to the `combine: "concat"` setting.

When using a generator, the previous contents of the file are given in the second argument:


```ts
const file = DefinePresetFile(Options, {
  // ...

combine: "concat",
  generator: (ctx, prev) => {
    const { merge } = ctx.util;

    // The `prev` variable holds the contents of the previous file that
    // we are replacing.

    // (You are free to perform any kind of manipulations on the contents
    //  of the file)

    return merge(prev, {
      entry: `../${prev.entry}`
    };
  }
});
```

## 3.3. Provide Action Overrides

Actions are defined exactly like before and they are executed in the order they were defined. This means that if there are two `build` actions, both the base AND your overriden `build` action will be executed.

If you want to execute something before or after the base action implementation you can define the `preRun` or `postRun` handlers:

```ts
const Action = DefineAction(Config, {
  preRun: (ctx) => {
    // ...
  },

  postRun: (ctx) => {
    // ...
  },
});
```

## 3.4. Create an Extended Entry Point

Just like the configuration options you must extend the preset entry point with the entry point of the previous preset:

```ts
// (1) Import the preset we are extending
import Preset from "eilos-preset-typescript";

// (2) Extend our preset using the base one
const Preset = DefinePreset(Preset, {
  // ...
});
```
