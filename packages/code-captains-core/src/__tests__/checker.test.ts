import { expect, test } from "vitest";

import { evaluateRepoPolicy } from "../checker.js";
import { AllFiles, DirectoryPolicy } from "../ir/ir-types-v1.js";

const globalFilePolicy = {
    codeCaptains: ["@me", "@myself", "@i"],
    fileFilter: {
        includePatterns: ["package.json", "/tsconfig.json"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const noNestingDocsPolicy = {
    codeCaptains: ["@documenters"],
    fileFilter: {
        includePatterns: ["**/docs/*"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const globalLogDirPolicy = {
    codeCaptains: ["@loggers"],
    fileFilter: {
        includePatterns: ["**/logs/**"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const globalWildcardFilePolicy = {
    codeCaptains: ["@scripters"],
    fileFilter: {
        includePatterns: ["*.js"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const rootDirPolicy = {
    codeCaptains: ["@builders"],
    fileFilter: {
        includePatterns: ["/build/**"],
        excludePatterns: [],
    },
    sourceFilePath: "code-captains.yml",
};

const subpackagePolicy = {
    codeCaptains: ["@subpackage-captain"],
    fileFilter: {
        includePatterns: AllFiles,
        excludePatterns: [],
    },
    sourceFilePath: "packages/subpackage/code-captains.yml",
};

const otherSubpackagePolicy = {
    codeCaptains: ["@other-subpackage-captain"],
    fileFilter: {
        includePatterns: AllFiles,
        excludePatterns: [],
    },
    sourceFilePath: "packages/other-subpackage/code-captains.yml",
};

const repoPolicy = {
    directoryPolicies: [
        globalFilePolicy,
        noNestingDocsPolicy,
        globalLogDirPolicy,
        globalWildcardFilePolicy,
        rootDirPolicy,
        subpackagePolicy,
        otherSubpackagePolicy,
    ],
};

const evaluateRepoPolicyTestCases: { changedFilePaths: string[]; expectedPolicies: DirectoryPolicy[] }[] = [
    {
        // root package.json
        changedFilePaths: ["no-match", "package.json"],
        expectedPolicies: [globalFilePolicy],
    },
    {
        // multi-level match package.json
        changedFilePaths: [
            "package.json",
            "packages/subpackage/package.json",
            "packages/other-subpackage/package.json",
        ],
        expectedPolicies: [globalFilePolicy, subpackagePolicy, otherSubpackagePolicy],
    },
    {
        // root /tsconfig.json
        changedFilePaths: ["tsconfig.json"],
        expectedPolicies: [globalFilePolicy],
    },
    {
        // nested tsconfig.json should not match
        changedFilePaths: ["src/nested/tsconfig.json"],
        expectedPolicies: [],
    },
    {
        // subpackage file
        changedFilePaths: ["packages/subpackage/src/main.tsx"],
        expectedPolicies: [subpackagePolicy],
    },
    {
        // docs/* wildcard
        changedFilePaths: ["docs/README.md"],
        expectedPolicies: [noNestingDocsPolicy],
    },
    {
        // docs/* wildcard should not propagate to nested dirs
        changedFilePaths: ["docs/build/artifact"],
        expectedPolicies: [],
    },
    {
        // any .js file
        changedFilePaths: ["src/apps/main.js"],
        expectedPolicies: [globalWildcardFilePolicy],
    },
    {
        // /build/ should apply to nested files
        changedFilePaths: ["build/nested/output.bin"],
        expectedPolicies: [rootDirPolicy],
    },
    {
        // /build/ should not apply to other dirs
        changedFilePaths: ["src/build/output.bin"],
        expectedPolicies: [],
    },
    {
        // **/logs wildcard at root
        changedFilePaths: ["logs/out.log"],
        expectedPolicies: [globalLogDirPolicy],
    },
    {
        // **/logs wildcard nested folder
        changedFilePaths: ["src/nested/logs/out.log"],
        expectedPolicies: [globalLogDirPolicy],
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
