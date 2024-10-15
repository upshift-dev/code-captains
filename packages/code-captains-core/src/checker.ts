import { relative, sep } from "path";

import { minimatch } from "minimatch";

import { DirectoryPolicy, RepoPolicy } from "./ir/ir-types-v1.js";

export type DirectoryPolicyResult = DirectoryPolicy & {
    isPolicyMet: boolean;
    matchingFiles: string[];
};

const anyPatternMatches = (relChangedFilePath: string, patterns: string[]) => {
    return patterns.find((pattern) => minimatch(relChangedFilePath, pattern, { matchBase: true })) !== undefined;
};

const evaluateDirectoryPolicy = (
    directoryPolicy: DirectoryPolicy,
    changedFilePaths: string[],
): DirectoryPolicyResult => {
    // Relativize paths, and filter out ones that wouldn't be relevant (different subdir)
    const relChangedFilePaths = changedFilePaths.flatMap((cfp) => {
        const relativePath = relative(directoryPolicy.sourceFilePath, cfp);
        if (relativePath.startsWith(`..${sep}..`) || relativePath.startsWith(sep)) {
            // The changed file isn't in the same directory, so ignore
            return [];
        }
        return [cfp];
    });

    // Exclude takes precedence, so check that first and short-circuit
    const matchingExcludedFiles = relChangedFilePaths.filter((rcfp) =>
        anyPatternMatches(rcfp, directoryPolicy.fileFilter.excludePatterns),
    );
    if (matchingExcludedFiles.length > 0)
        return { ...directoryPolicy, isPolicyMet: false, matchingFiles: matchingExcludedFiles };

    // all-files case
    const { includePatterns } = directoryPolicy.fileFilter;
    if (includePatterns === "all-files")
        return {
            ...directoryPolicy,
            isPolicyMet: true,
            matchingFiles: relChangedFilePaths,
        };

    // Include case
    const matchingIncludedFiles = relChangedFilePaths.filter((rcfp) => anyPatternMatches(rcfp, includePatterns));
    if (matchingIncludedFiles.length > 0)
        return { ...directoryPolicy, isPolicyMet: true, matchingFiles: matchingIncludedFiles };

    // If nothing matched
    return { ...directoryPolicy, isPolicyMet: false, matchingFiles: [] };
};

export const evaluateRepoPolicy = async (repoPolicy: RepoPolicy, changedFilePaths: string[]) => {
    // TODO(thomas): Logging for no match case
    const policyResults = repoPolicy.directoryPolicies.map((dirPolicy) =>
        evaluateDirectoryPolicy(dirPolicy, changedFilePaths),
    );
    const metPolicies = policyResults.filter((result) => result.isPolicyMet);

    // Build set of unique code captains
    const uniqueCodeCaptains = new Set(metPolicies.flatMap((policy) => policy.codeCaptains));

    return {
        codeCaptains: uniqueCodeCaptains,
        metPolicyFilePaths: metPolicies.map((policy) => policy.sourceFilePath),
    };
};
