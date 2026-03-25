#!/usr/bin/env node

import { runCli } from "../dist/index.mjs";

await runCli(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
