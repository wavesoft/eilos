import {
  DefineAction,
  DefinePresetOptions,
  DefinePreset,
  DefinePresetConfig,
  DefinePresetFile,
} from "./Factories";
import { PresetUserConfig } from "./PresetUserConfig";

const cfgOpt1 = DefinePresetOptions({
  name: {
    schema: {
      type: "string",
    },
  },
  thingieMagic: {
    schema: {
      type: "int32",
    },
  },
});

const cfgIndexJs = DefinePresetFile(cfgOpt1, {
  generator: (ctx) => {
    return "";
  },
});

const cfgFooJs = DefinePresetFile(cfgOpt1, {
  generator: (ctx) => {
    return "";
  },
});

const cfg = DefinePresetConfig({
  options: cfgOpt1,
  files: {
    "index.js": cfgIndexJs,
    "foo.json": cfgFooJs,
  },
});

const action = DefineAction(cfg, {
  arguments: {
    thoughts: {
      type: "number",
      required: true,
    },
  },
  useFiles: ["foo.json"],
  files: {
    "fafun.js": {
      generator: (ctx, prev) => {
        const v = ctx.getConfig("name");
        ctx.getConfigFilePath("foo.json");
        return prev || "";
      },
    },
  },
  run: async (ctx) => {
    ctx.getConfigFilePath("foo.json");
    ctx.getConfigFilePath("index.js");
  },
});

const p = DefinePreset({
  engineVersion: "",
  config: cfg,
  actions: {
    action,
  },
});

const cfg2 = DefinePresetConfig(cfg, {
  options: {
    thirdie: {
      schema: {
        type: "int32",
      },
    },
  },

  files: {
    "tsconfig.json": {
      contents: "",
    },
  },
});

const action2 = DefineAction(cfg2, {
  files: {
    "fakatis.js": {
      generator: (ctx) => {
        return "";
      },
    },
  },
  run: async (ctx) => {
    ctx.getConfigFilePath("tsconfig.json");
  },
});

const p2 = DefinePreset(p, {
  engineVersion: "",
  config: cfg2,
  actions: {
    action2,
  },
});

////

/**
 * User-configurable options for this preset
 */
export const Config = DefinePresetConfig({
  files: {
    "webpack.config.js": {
      generator: (ctx) => {
        return "";
      },
    },
    "tsconfig.json": {
      generator: (ctx) => {
        return "";
      },
    },
    "@types/typings.d.ts": { contents: "" },
  },

  options: {
    hot: {
      defaultValue: false,
      description: "Enable hot module loading in the emitted source",
      schema: {
        type: "boolean",
      },
    },
    embedAssets: {
      defaultValue: false,
      description:
        "Enable this flag to embed all assets as base64 blobs into the bundle",
      schema: {
        type: "boolean",
      },
    },

    entry: {
      defaultValue: "./src/index.ts",
      description: "The entry point(s) to the project sources",
      schema: [
        {
          type: "string",
        },
        {
          values: {
            type: "string",
          },
        },
      ],
    },

    library: {
      defaultValue: false,
      description:
        "When set to string instead of 'false', will build a library bundle",
      schema: [
        {
          type: "string",
        },
        {
          type: "boolean",
        },
      ],
    },

    output: {
      defaultValue: "[id].js",
      description: "The name of the output bundle",
      schema: {
        type: "string",
      },
    },

    outputDir: {
      defaultValue: "./dist",
      description: "The directory were to emit the output bundle",
      schema: {
        type: "string",
      },
    },

    staticDir: {
      defaultValue: "./static",
      description:
        "Specifies the static directory that -if exists- will be copied to the build directory",
      schema: {
        type: "string",
      },
    },

    externals: {
      defaultValue: [],
      description:
        "Indicates the resources that are external to the project and must be referred to using UMD",
      schema: {
        elements: {
          type: "string",
        },
      },
    },

    sourceModules: {
      defaultValue: [],
      description:
        "An array of packages from 'node_module' modules to include in the processing chain when resolving. " +
        "This is useful when sourcing a typescript source package that must be pre-processed.",
      schema: {
        elements: {
          type: "string",
        },
      },
    },

    prettierFilePatterns: {
      defaultValue: ["src/**/*.js", "src/**/*.ts", "**/*.md"],
      description:
        "An array of file patterns to consider for the linting phase.",
      schema: {
        elements: {
          type: "string",
        },
      },
    },

    //////////////////////////////////////
    // Deprecated parameters
    //////////////////////////////////////
    webpack: {
      deprecated:
        "You should never override this configuration, instead you should create a custom preset for your needs",
      description: "Arbitrary configuration to forward to webpack as-is",
      schema: {
        properties: {},
        additionalProperties: true,
      },
    },
    tsconfig: {
      deprecated:
        "You should never override this configuration, instead you should create a custom preset for your needs",
      description: "Arbitrary configuration to forward to typescript as-is",
      schema: {
        properties: {},
        additionalProperties: true,
      },
    },
    jest: {
      deprecated:
        "You should never override this configuration, instead you should create a custom preset for your needs",
      description: "Arbitrary configuration to forward to jest as-is",
      schema: {
        properties: {},
        additionalProperties: true,
      },
    },
    eslint: {
      deprecated:
        "You should never override this configuration, instead you should create a custom preset for your needs",
      description: "Arbitrary configuration to forward to eslint as-is",
      schema: {
        properties: {},
        additionalProperties: true,
      },
    },
    prettier: {
      deprecated:
        "You should never override this configuration, instead you should create a custom preset for your needs",
      description: "Arbitrary configuration to forward to prettier as-is",
      schema: {
        properties: {},
        additionalProperties: true,
      },
    },
  },
});

///


let user: PresetUserConfig<typeof Config> = {};

user.externals = [
  "foo"
]