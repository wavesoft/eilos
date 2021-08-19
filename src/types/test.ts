import { DefineAction, DefinePreset, DefinePresetConfig } from "./Factories";

const cfg = DefinePresetConfig({
  options: {
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
  },

  files: {
    "index.js": {
      generator: (ctx) => {
        return "";
      },
    },
    "foo.json": {
      contents: "",
    },
  },
});

const action = DefineAction(cfg, {
  arguments: {
    thoughts: {
      type: "number",
      required: true
    }
  },
  files: {
    "fafun.js": {
      generator: (ctx, prev) => {
        const v = ctx.getConfig("name")
        ctx.getConfigFilePath("foo.json")
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
