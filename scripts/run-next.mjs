import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
const local = path.resolve(
  "node_modules/node/bin",
  process.platform === "win32" ? "node.exe" : "node",
);
const binary = existsSync(local) ? local : process.execPath;
// Turbopack's CSS workers also find Node on PATH. Put the same runtime first.
const environment = {
  ...process.env,
  PATH: `${path.dirname(binary)}${path.delimiter}${process.env.PATH ?? ""}`,
  NEXT_TELEMETRY_DISABLED: "1",
};
const child = spawn(
  binary,
  [path.resolve("node_modules/next/dist/bin/next"), ...process.argv.slice(2)],
  { stdio: "inherit", env: environment, windowsHide: true },
);
child.on("error", () => {
  console.error(
    "The Next.js runtime could not start. Install dependencies and use Node 24.",
  );
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
