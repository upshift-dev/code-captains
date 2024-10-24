import { once } from "events";
import { createReadStream, existsSync, statSync } from "fs";
import { createInterface } from "readline/promises";

import { DirectoryPolicy, writeRepoPolicy } from "@upshift-dev/code-captains-core";

type MigrateResult = {
    type: "success";
};

type MigrateError = {
    type: "no-codeowners" | "unknown-error";
    message: string;
};

export const migrateEntry = (line: string, maximizeDepth: boolean = false): DirectoryPolicy | null => {
    if (line.startsWith("#")) return null;

    const lineElements = line.split(/\s+/);
    if (lineElements.length < 2) return null;

    const path = lineElements[0];
    const captains = lineElements.slice(1);
    const lastCaptainIndex = captains.findIndex((captain) => captain.startsWith("#"));

    const actualCaptains = captains.filter(
        (captain, idx) => captain.startsWith("@") && (lastCaptainIndex === -1 || idx < lastCaptainIndex),
    );
    if (actualCaptains.length === 0) return null;

    const pathElements = path.split("/");
    let sourceFilePathPrefix = "";
    let pathIndex = 0;

    while (
        maximizeDepth &&
        pathIndex < pathElements.length - 1 && // If there are no more path elements after this one, don't nest
        pathElements[pathIndex] != null &&
        !pathElements[pathIndex].includes("*")
    ) {
        sourceFilePathPrefix += `${pathElements[pathIndex]}/`;
        pathIndex += 1;
    }

    let pattern = pathElements.slice(pathIndex).join("/");
    if (!path.endsWith("*")) {
        // If the path doesn't end with *, we stat the FS entry to see if it is a dir or a file
        // If it's a dir, we append /** to the end
        if (existsSync(path) && statSync(path).isDirectory()) {
            pattern += "/**";
        }
    }

    return {
        sourceFilePath: `${sourceFilePathPrefix}code-captains.yml`,
        fileFilter: {
            includePatterns: [pattern],
            excludePatterns: [],
        },
        codeCaptains: actualCaptains,
    };
};

export const migrate = async (path: string, maximizeDepth: boolean = false): Promise<MigrateResult | MigrateError> => {
    try {
        const stream = createReadStream(path, "utf-8");
        const rl = createInterface({
            input: stream,
            crlfDelay: Infinity,
        });

        const policies: DirectoryPolicy[] = [];
        rl.on("line", (line) => {
            const policy = migrateEntry(line, maximizeDepth);
            if (policy) {
                policies.push(policy);
            }
        });

        await once(rl, "close");

        await writeRepoPolicy({ directoryPolicies: policies });
        console.log("Migration complete!");

        return { type: "success" };
    } catch (error) {
        if (error instanceof Error && error.code === "ENOENT") {
            console.error("Could not find CODEOWNERS file in current directory.");
            return { type: "no-codeowners", message: "Could not find CODEOWNERS file at provided path." };
        }

        console.error(error);
        return { type: "unknown-error", message: "An unknown error occurred." };
    }
};
