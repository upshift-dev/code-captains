import { promises as fs } from "fs";
import path, { relative } from "path";

import { evaluateRepoPolicy, renderRepoPolicy } from "@upshift-dev/code-captains-core";

export const runTestEvaluation = async (changedFiles: string[], verbose: boolean) => {
    const cwd = process.cwd();
    const codeCaptainsFiles = (await fs.readdir(cwd, { withFileTypes: true, recursive: true }))
        .filter((entry) => entry.name === "code-captains.yml" && !entry.isDirectory())
        .map((entry) => relative(cwd, path.join(entry.parentPath, entry.name)));

    const repoPolicy = await renderRepoPolicy(codeCaptainsFiles);
    if (verbose) {
        console.log("Rendered the following repo-wide policy:", JSON.stringify(repoPolicy));
    }

    const codeCaptainsResult = await evaluateRepoPolicy(repoPolicy, changedFiles);
    if (verbose) {
        console.log("Code captains result:", JSON.stringify(codeCaptainsResult));
    }
    if (codeCaptainsResult.metPolicies.length > 0) {
        codeCaptainsResult.metPolicies.forEach((policy) => {
            console.log(
                "Policy at %s was triggered by files %s, requiring review by one of %s",
                policy.policyFilePath,
                policy.matchingFiles,
                policy.captains,
            );
        });
    } else {
        console.log("No files matched the code captains policies");
    }
};
