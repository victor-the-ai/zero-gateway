import { defineConfig } from "tsup";

export default defineConfig([
  // Node / Server Build
  {
    entry: {
      index: "src/index.ts",
      cli: "src/cli.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: false,
    shims: true,
    target: "es2022",
  },
  // Browser Build
  {
    entry: {
      "zerogateway.browser": "src/browser.ts",
    },
    format: ["iife", "esm"],
    globalName: "ZeroGateway",
    platform: "browser",
    minify: false,
    sourcemap: true,
    target: "es2022",
  },
]);
