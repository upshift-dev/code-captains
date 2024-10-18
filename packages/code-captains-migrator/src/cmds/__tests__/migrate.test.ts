import { DirectoryPolicy } from "@upshift-dev/code-captains-core";
import { expect, test } from "vitest";

import { migrate, migrateEntry } from "../migrate.js";

test("migrate no CODEOWNERS", async () => {
    const noCodeowners = await migrate("invalid-path");

    expect(noCodeowners.type).toEqual("no-codeowners");
});

const migrateEntryTestCases: { line: string; maximizeDepth: boolean; policy: DirectoryPolicy | null }[] = [
    {
        line: "",
        maximizeDepth: false,
        policy: null,
    },
    {
        line: "",
        maximizeDepth: true,
        policy: null,
    },
    {
        line: "# This is a comment",
        maximizeDepth: false,
        policy: null,
    },
    {
        line: "docs/* @upshift-dev/code-captains",
        maximizeDepth: false,
        policy: {
            sourceFilePath: "code-captains.yml",
            fileFilter: {
                includePatterns: ["docs/*"],
                excludePatterns: [],
            },
            codeCaptains: ["@upshift-dev/code-captains"],
        },
    },
    {
        line: "docs/* @upshift-dev/code-captains",
        maximizeDepth: true,
        policy: {
            sourceFilePath: "docs/code-captains.yml",
            fileFilter: {
                includePatterns: ["*"],
                excludePatterns: [],
            },
            codeCaptains: ["@upshift-dev/code-captains"],
        },
    },
    {
        line: "*.js @upshift-dev/code-captains @upshift-dev/front-end",
        maximizeDepth: true,
        policy: {
            sourceFilePath: "code-captains.yml",
            fileFilter: {
                includePatterns: ["*.js"],
                excludePatterns: [],
            },
            codeCaptains: ["@upshift-dev/code-captains", "@upshift-dev/front-end"],
        },
    },
    {
        line: "docs/* test@upshift.dev",
        maximizeDepth: false,
        policy: null,
    },
    {
        line: "docs/* @upshift #This @is an inline comment",
        maximizeDepth: false,
        policy: {
            sourceFilePath: "code-captains.yml",
            fileFilter: {
                includePatterns: ["docs/*"],
                excludePatterns: [],
            },
            codeCaptains: ["@upshift"],
        },
    },
    {
        line: "package.json @upshift",
        maximizeDepth: true,
        policy: {
            sourceFilePath: "code-captains.yml",
            fileFilter: {
                includePatterns: ["package.json"],
                excludePatterns: [],
            },
            codeCaptains: ["@upshift"],
        },
    },
];

test.for(migrateEntryTestCases)("migrateEntry %#", async (testCase) => {
    const { line, maximizeDepth, policy: expectedPolicy } = testCase;

    const actualPolicy = migrateEntry(line, maximizeDepth);

    expect(actualPolicy).toEqual(expectedPolicy);
});
