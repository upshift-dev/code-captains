import { rmSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";

import { expect, test } from "vitest";

import { writeRepoPolicy } from "../serializer.js";

import { constructRepoPolicy } from "./repoPolicy.js";

const TEST_POLICY_OUTDIR = "packages/code-captains-core/src/__tests__/out-test-policy";

test("dirname", () => {
    expect(dirname("package.json")).toEqual(".");
});

test("irToFiles", async () => {
    await mkdir(TEST_POLICY_OUTDIR, { recursive: true });
    await writeRepoPolicy(constructRepoPolicy(TEST_POLICY_OUTDIR));

    rmSync(TEST_POLICY_OUTDIR, { recursive: true, force: true });
});
