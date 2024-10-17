export const TEST_POLICY_DIR = "packages/code-captains-core/src/__tests__/test-policy";

export const constructRepoPolicy = (policyDir: string) => ({
    directoryPolicies: [
        {
            codeCaptains: ["@me", "@myself", "@i"],
            fileFilter: {
                includePatterns: ["package.json", "tsconfig.json"],
                excludePatterns: [],
            },
            sourceFilePath: `${policyDir}/code-captains.yml`,
        },
        {
            codeCaptains: ["@gitexperts"],
            fileFilter: {
                includePatterns: [".gitignore"],
                excludePatterns: [],
            },
            sourceFilePath: `${policyDir}/code-captains.yml`,
        },
        {
            codeCaptains: ["@subpackage-captain"],
            fileFilter: {
                includePatterns: "all-files" as const,
                excludePatterns: ["shared-file.txt"],
            },
            sourceFilePath: `${policyDir}/packages/subpackage/code-captains.yml`,
        },
    ],
});
