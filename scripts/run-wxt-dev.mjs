import { spawn } from "node:child_process";
import { resolve } from "node:path";

const patchPath = resolve(process.cwd(), "scripts/disable-net-use.cjs");
const nodeOptions = process.env.NODE_OPTIONS
    ? `${process.env.NODE_OPTIONS} --require=${patchPath}`
    : `--require=${patchPath}`;
const forwardedArgs = process.argv.slice(2);

const child = spawn(
    process.execPath,
    [resolve("node_modules/wxt/bin/wxt.mjs"), ...forwardedArgs],
    {
        cwd: process.cwd(),
        stdio: "inherit",
        env: {
            ...process.env,
            NODE_OPTIONS: nodeOptions,
        },
    },
);

child.on("exit", (code, signal) => {
    if (typeof code === "number") {
        process.exit(code);
    }

    process.exit(signal ? 1 : 0);
});
