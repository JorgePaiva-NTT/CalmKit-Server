// scripts/build.mjs
import { build } from "esbuild";

await build({
  entryPoints: ["server.js"], // your server entry
  outfile: "dist/server.js",
  platform: "node",
  target: "node14", // Zero W tends to run older Node from apt
  bundle: true,
  minify: true,
  sourcemap: false,
  // keep native/optional deps external to avoid trouble on ARMv6
  external: [
    "bcrypt",
    "argon2", // native variants (you use bcryptjs, so fine)
    "bufferutil",
    "utf-8-validate",
    "mongodb-client-encryption", // optional dep in MongoDB ecosystem
  ],
});
console.log("Bundled → dist/server.js");
