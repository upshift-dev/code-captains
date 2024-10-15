import { expect, test } from "vitest";

import { evaluateRepoPolicy } from "../checker.js";
import { AllFiles, DirectoryPolicy } from "../ir/ir-types-v1.js";

const rootPolicy = {
    codeCaptains: ["@me", "@myself", "@i"],
    fileFilter: {
        includePatterns: ["package.json", "tsconfig.json"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const rootDocsPolicy = {
    codeCaptains: ["@documenters"],
    fileFilter: {
        includePatterns: ["docs/*"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const rootLogDirPolicy = {
    codeCaptains: ["@loggers"],
    fileFilter: {
        includePatterns: ["**/logs/**"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const rootJsFilePolicy = {
    codeCaptains: ["@scripters"],
    fileFilter: {
        includePatterns: ["*.js"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const subpackagePolicy = {
    codeCaptains: ["@subpackage-captain"],
    fileFilter: {
        includePatterns: AllFiles,
        excludePatterns: ["nested-shared-file.txt", "/root-shared-file.txt"],
    },
    sourceFilePath: "packages/subpackage/code-captains.yml",
};

const otherSubpackagePolicy = {
    codeCaptains: ["@other-subpackage-captain"],
    fileFilter: {
        includePatterns: AllFiles,
        excludePatterns: ["shared-file.txt"],
    },
    sourceFilePath: "packages/other-subpackage/code-captains.yml",
};

const repoPolicy = {
    directoryPolicies: [
        rootPolicy,
        rootDocsPolicy,
        rootLogDirPolicy,
        rootJsFilePolicy,
        subpackagePolicy,
        otherSubpackagePolicy,
    ],
};

const evaluateRepoPolicyTestCases: { changedFilePaths: string[]; expectedPolicies: DirectoryPolicy[] }[] = [
    {
        // root package.json
        changedFilePaths: ["no-match", "package.json"],
        expectedPolicies: [rootPolicy],
    },
    {
        // multi-level match package.json
        changedFilePaths: [
            "package.json",
            "packages/subpackage/package.json",
            "packages/other-subpackage/package.json",
        ],
        expectedPolicies: [rootPolicy, subpackagePolicy, otherSubpackagePolicy],
    },
    {
        // subpackage file
        changedFilePaths: ["packages/subpackage/src/main.tsx"],
        expectedPolicies: [subpackagePolicy],
    },
    {
        // docs/* wildcard
        changedFilePaths: ["docs/README.md"],
        expectedPolicies: [rootDocsPolicy],
    },
    {
        // docs/* wildcard should not propagate to nested dirs
        changedFilePaths: ["docs/build/artifact"],
        expectedPolicies: [],
    },
    {
        // js file
        changedFilePaths: ["src/apps/main.js"],
        expectedPolicies: [rootJsFilePolicy],
    },
    {
        // **/logs wildcard at root
        changedFilePaths: ["logs/out.log"],
        expectedPolicies: [rootLogDirPolicy],
    },
    {
        // **/logs wildcard nested folder
        changedFilePaths: ["src/nested/logs/out.log"],
        expectedPolicies: [rootLogDirPolicy],
    },
];

test.for(evaluateRepoPolicyTestCases)("evaluateRepoPolicy %#", async (testCase) => {
    const { changedFilePaths, expectedPolicies } = testCase;

    const result = await evaluateRepoPolicy(repoPolicy, changedFilePaths);

    expect(result).toStrictEqual({
        codeCaptains: new Set(expectedPolicies.flatMap((policy) => policy.codeCaptains)),
        metPolicyFilePaths: new Set(expectedPolicies.map((policy) => policy.sourceFilePath)),
    });
});
