import * as esbuild from "esbuild";
import { argv } from "process";

const isWatch = argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const config = {
  entryPoints: ["src/index.ts"],
  outfile: "dist/widget.js",
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  target: "es2018",
  format: "iife",
  globalName: "LeadPing",
  platform: "browser",
  define: {
    "process.env.NODE_ENV": isWatch ? '"development"' : '"production"',
  },
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  const result = await esbuild.build({
    ...config,
    metafile: true,
  });

  const text = await esbuild.analyzeMetafile(result.metafile);
  console.log(text);

  const sizeKb = (result.metafile.outputs["dist/widget.js"]?.bytes ?? 0) / 1024;
  console.log(`\nBundle size: ${sizeKb.toFixed(2)}kb (target: <20kb)`);

  if (sizeKb > 20) {
    console.warn("WARNING: Bundle exceeds 20kb target!");
    process.exit(1);
  }
}
