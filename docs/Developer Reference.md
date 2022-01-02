# Developer Reference

The core feature of `είλως` is to create configuration files that are tied to parametrisable properties instead to a concrete configuration values. Therefore, the main purpose of `είλως` is to:

- _Create static configuration files_ (text files, json files, xml files, etc.), that are parametrisable based on auto-detected or explicitly given configuration arguments.
- _Create dynamic configuration files_ (javascript files), that have configurable logic, based on the given configuration arguments.
- _Invoke commands_ with arguments or environment variables parametrised, based on the given configuration arguments.

We can break-down the logic behind `είλως` in two approaches: either by entry point or by it's internal structures.

# 1. Breakdown by Entry Point

`είλως` exports two runtime functions and a set of typescript definitions. 

The easiest way to familiarise yourself with the codebase is to start from the `entry-cli.ts` file that holds the `cli` entrypoint and go through the actions involved. You can refer to section §2 to learn more about the structures you encounter.

## 1.1. `cli(...argv)` - the CLI entry point

This is the only entrypoint useful to the consumer. It accepts an array of arguments given and it immediately performs the desired operation.

It takes control of STDIN and STDOUT, it starts the logger and performs the requested operation. On failure it exits the process with a non-zero exit code.

The logic of this function is to load the environment configuration in the respective `ProjectConfig` structure, identify the desired `Action` to invoke, and then call-out to the action handler.

The actual action invocation process is implemented in the `invokeAction()` function in the `action.ts` file. It involves preparing the temporary configuration directory, and then invoking the pre and post phases of the action. Upon success, the temporary confi directory is then deleted.

## 1.2. `invokeFileFunction()` - the dynamic configuration entry point

This function is called indirectly by the auto-generated, dynamic `<config file>.js` files. It is used to re-construct the pathways to the configuration sources and eventually run the designated configuration function for this particular file.

This function has no practical use to the consumers.

## 1.3. Typescript Definitions

The `eilos` package also provides the SDK API definitions that the presets can use for define their types.

This also provides the foundation for making configuration files strictly typed using the `@typedef` annotations in the `.eilos.js` configuration files:

```js
/** @typedef { import('eilos-preset-typescript').UserConfig } UserConfig */

/**
 * @type {UserConfig}
 */
module.exports = {
  // ...
};
```

# 2. Breakdown by Structures

## 2.1. `RuntimeContext` structure

The backbone of an eilos configuration is the `RuntimeContext`. This holds all the configurable values and is aware of the location of all configuration files in the project. More specifically, it holds:

- The **environment** variables present at invocation time.
- The values of all the configurable **argumnets**.
- The location and contents of all configuration **files** preent in the project.
- The available **actions** that can be performed.

It is constructed blank when the `cli` is invoked, and it's further enhanced as the system parses the user configuration.

It is also constructed when a dynamic entry point (§1.2) is invoked. However, instead of re-computing the context based on the environment at the execution time, a _frozen_ version of the context is used instead.

The _frozen_ version of the context is computed when the configuration file is generated. The function `RuntimeContext::freeze` can be used for this purpose. The respective thawing function `RuntimeContext::thaw` is called during recovery time.

Finally, the `RuntimeContext` also provides a plethora of high-level, context-specific operations and library functions that the presets can use without including any additional dependencies. For example:

```ts
const Action = DefineAction(Config, {
  run: (ctx) => {
    // Get path to some config (context-specific operation)
    const path = ctx.getConfigFilePath("webpack.config.js");

    // Merge two objects (library function)
    const objectC = ctx.merge(objectA, objectB);

    // Execute an external process, with the current
    // environment configuration (context-specific & library function)
    const ret = ctx.exec("webpack", ["--config", path])
  },
});
```

## 2.2. `Preset` structure

The preset structure is an encapsulation of the user-configurable parameters. It is strongly typed using generics in oder to ensure configuration-time validation of the designed arguments.

The information a `Preset` holds includes:

- The compatible `engineVersion`
- The announced `actions`
- The included configuration `files`
- The available `options` for the user to tweak

More specifically, actions are defined in the `Action` structure and the files are stored in the `ConfigFile` structures, explained below.

## 2.3. `ProjectConfig` structure

The `ProjectConfig` structure encapsulates the project's `RuntimeContext` and `Preset`. It is used to deliver high-level functionality that requires both config and context in the same place, such as accessing the file contents, file locations etc.

It is also used to compute the `RuntimeConfig` that holds the values of all configurable arguments.

This structure is only used internally on `eilos` core and is not exposed to the presets.

It is constructed using the `getDefaultProjectConfig` function in `config.ts`, after analysing all the configuration sources for the project.

## 2.4. `RuntimeConfig` structure

This structure holds the values of all configurable arguments. 

It is short-lived and only used in `getProjectConfig()` function for collecting the user-provided options. It remains it's own structure mainly for Typescript Annotation purposes.

## 2.5. `Action` structure

It holds the description of a desired user-invocable action. The actual invocation happens in 3 phases:

- `preRun` is called first
- `run` is called after and finally
- `postRun` is run last

The reason for having three different phases is apparent when different presets extends each other. For example if preset A implements the `run` phase for the `build` action, preset B could provide a `preRun` (or `postRun`) version for the same `build` action (without implementing a `run` handler), enabling it to run a script before (or after) the execution.

Before the action handlers are invoked, all the desired configuration files (indicated by the `useFiles` property) are created in the configured locations.

Arguments can also be specified for each action. The argument definition is specified in the `arguments` property and it's translated into `yargs` configuration upon execution. This allows the arguments to appear on the `--help` listing.

## 2.6. `ConfigurationFile` structure

It holds the specifications for a particular configuration file. Since there are different types of configuration files the following set of abstractions are used:

1. The contents of the file can be static or dynamic. For this reason, the user can either specify a `contents` (static) property, or a `generator` function (dynamic) that will be called when the contents of the file are needed.

2. The file definitions should be combine-able, since a preset might extend another preset. For this reason, each configuration file must be defined with a required `mimeType` property, and an optional `combine` strategy. Based on this information the system either combines the output of the different configurations, or it makes the most recent replace the previous.

For reference, the logic for combining the different configuration contents can be found in the `mergeContents` function in `config.ts`.