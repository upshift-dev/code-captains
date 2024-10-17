import * as path from "path";

import { expect, test } from "vitest";

import { renderRepoPolicy } from "../parser.js";

import { constructRepoPolicy, TEST_POLICY_DIR } from "./repoPolicy.js";

test("filesToIr", async () => {
    const repoPolicy = await renderRepoPolicy([
        path.join(TEST_POLICY_DIR, "code-captains.yml"),
        path.join(TEST_POLICY_DIR, "packages/subpackage/code-captains.yml"),
    ]);
    expect(repoPolicy).toStrictEqual(constructRepoPolicy(TEST_POLICY_DIR));
});
