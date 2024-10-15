import path from "path";

import { expect, test } from "vitest";

import { filesToIr } from "../parser.js";

const testPolicyDir = "packages/code-captains-core/src/__tests__/test-policy";

test("filesToIr", async () => {
    const ir = await filesToIr([
        path.join(testPolicyDir, "code-captains.yml"),
        path.join(testPolicyDir, "packages/subpackage/code-captains.yml"),
    ]);
    expect(ir).toStrictEqual({
        directoryPolicies: [
            {
                codeCaptains: ["@me", "@myself", "@i"],
                fileFilter: {
                    exclude: [],
                    include: ["package.json", "tsconfig.json"],
                },
                sourceFilePath: "packages/code-captains-core/src/__tests__/test-policy/code-captains.yml",
            },
            {
                codeCaptains: ["@subpackage-captain"],
                fileFilter: {
                    exclude: ["shared-file.txt"],
                    include: "all-files",
                },
                sourceFilePath:
                    "packages/code-captains-core/src/__tests__/test-policy/packages/subpackage/code-captains.yml",
            },
        ],
    });
});
