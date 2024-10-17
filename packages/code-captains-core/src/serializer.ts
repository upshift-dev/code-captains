import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

import { stringify } from "yaml";

import { RepoPolicy } from "./ir/ir-types-v1.js";
import { DirectorySpec } from "./spec/directory-spec-v1.js";

export const writeRepoPolicy = async (repoPolicy: RepoPolicy) => {
    const groupedPolicies = repoPolicy.directoryPolicies.reduce(
        (acc, policy) => {
            const key = policy.sourceFilePath;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(policy);
            return acc;
        },
        {} as Record<string, RepoPolicy["directoryPolicies"]>,
    );

    await Promise.all(
        Object.entries(groupedPolicies).map(async ([sourceFilePath, policies]) => {
            const directorySpec: DirectorySpec = {
                version: 1,
                policies: policies.map((policy) => ({
                    include:
                        policy.fileFilter.includePatterns === "all-files"
                            ? undefined
                            : policy.fileFilter.includePatterns,
                    exclude: policy.fileFilter.excludePatterns,
                    captains: policy.codeCaptains,
                })),
            };

            const dir = dirname(sourceFilePath);
            await mkdir(dir, { recursive: true });
            await writeFile(sourceFilePath, stringify(directorySpec));
        }),
    );
};
