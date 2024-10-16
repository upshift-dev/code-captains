import * as path from "path";

import { expect, test } from "vitest";

import { renderRepoPolicy } from "../parser.js";

const testPolicyDir = "packages/code-captains-core/src/__tests__/test-policy";

test("filesToIr", async () => {
    const repoPolicy = await renderRepoPolicy([
        path.join(testPolicyDir, "code-captains.yml"),
        path.join(testPolicyDir, "packages/subpackage/code-captains.yml"),
    ]);
    expect(repoPolicy).toStrictEqual({
        directoryPolicies: [
            {
                codeCaptains: ["@me", "@myself", "@i"],
                fileFilter: {
                    includePatterns: ["package.json", "tsconfig.json"],
                    excludePatterns: [],
                },
                sourceFilePath: `${testPolicyDir}/code-captains.yml`,
            },
            {
                codeCaptains: ["@gitexperts"],
                fileFilter: {
                    includePatterns: [".gitignore"],
                    excludePatterns: [],
                },
                sourceFilePath: `${testPolicyDir}/code-captains.yml`,
            },
            {
                codeCaptains: ["@subpackage-captain"],
                fileFilter: {
                    includePatterns: "all-files",
                    excludePatterns: ["shared-file.txt"],
                },
                sourceFilePath: `${testPolicyDir}/packages/subpackage/code-captains.yml`,
            },
        ],
    });
});
