#!/usr/bin/env node

import { program } from "commander";

import { runTestEvaluation } from "./cmds/evaluate.js";
import { migrate } from "./cmds/migrate.js";

const main = async () => {
    program
        .name("@upshift-dev/migrator")
        .description("A CLI to help migrate CODEOWNERS into captain files.")
        // todo: come up with clever way to keep this in sync with package.json
        .version("1.0.3");

    program
        .command("migrate")
        .description("Run the actual migration")
        .argument("[file]", "Path to CODEOWNERS file", "CODEOWNERS")
        .option("-d, --maximize-depth", "Maximize depth of captain files", false)
        .action(async (file: string, options: { maximizeDepth: boolean }) => {
            const res = await migrate(file, options.maximizeDepth);
            if (res.type !== "success") {
                console.error(res.message);
                process.exit(1);
            }
        });

    program
        .command("test")
        .description("Test if file paths match code captains policies")
        .argument("<files...>", "List of file paths (relative to the root of the repo)")
        .option("-v, --verbose", "Log verbose results", false)
        .action(async (files: string[], options: { verbose: boolean }) => {
            const { verbose } = options;
            await runTestEvaluation(files, verbose);
        });

    await program.parseAsync();
};

main();
