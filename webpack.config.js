const path = require("path");
const isDevel = process.env.NODE_ENV === "development";

module.exports = {
  entry: "./src/index.ts",
  target: "node",
  devtool: "source-map", // isDevel ? "source-map" : false,
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
      name: "eilos",
      type: "umd",
    },
  },
};
