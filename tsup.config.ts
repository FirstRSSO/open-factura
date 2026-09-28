import { defineConfig } from "tsup";
import { copyFileSync, existsSync } from "fs";
import { resolve } from "path";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".mjs",
    };
  },
  onSuccess: async () => {
    const dts = resolve("dist/index.d.ts");
    const dcts = resolve("dist/index.d.cts");
    if (existsSync(dts)) {
      copyFileSync(dts, dcts);
    }
  },
});
