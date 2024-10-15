import { expect, test } from "vitest";

import { evaluateRepoPolicy } from "../checker.js";
import { RepoPolicy } from "../ir/ir-types-v1.js";

test("evaluate", async () => {
    // TODO(thomas): Look up how to use vitest better
    const repoPolicy: RepoPolicy = {
        directoryPolicies: [
            {
                sourceFilePath: "root.yml",
                fileFilter: {
                    includePatterns: ["package.json", "tsconfig.json"],
                    excludePatterns: [],
                },
                codeCaptains: ["me"],
            },
        ],
    };
    expect(await evaluateRepoPolicy(repoPolicy, ["packages/code-captains-core/package.json"])).toStrictEqual({
        codeCaptains: new Set(["me"]),
        metPolicyFilePaths: ["root.yml"],
    });
});
