#!/usr/bin/env node

import { program } from "commander";

import { migrate } from "./cmds/migrate.js";

const main = async () => {
    program
        .name("@upshift-dev/migrator")
        .description("A CLI to help migrate CODEOWNERS into captain files.")
        // todo: come up with clever way to keep this in sync with package.json
        .version("0.1.5");

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

    await program.parseAsync();
};

main();
