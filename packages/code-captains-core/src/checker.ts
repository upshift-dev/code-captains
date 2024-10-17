import { relative, sep } from "path";

import { minimatch } from "minimatch";

import { DirectoryPolicy, RepoPolicy } from "./ir/ir-types-v1.js";

export type DirectoryPolicyResult = DirectoryPolicy & {
    isPolicyMet: boolean;
    matchingFiles: string[];
};

const anyPatternMatches = (relChangedFilePath: string, patterns: string[]) => {
    return (
        patterns.find((pattern) =>
            minimatch(relChangedFilePath, pattern, {
                matchBase: true,
                // Disable comments and negations for simplicity
                nocomment: true,
                nonegate: true,
            }),
        ) !== undefined
    );
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
        if (relativePath.startsWith(`..${sep}`)) {
            // NOTE(thomas): At this point, paths should always start with ../
            //  We trim off the leading .. so that our comparisons view this as a "root" file
            return [relativePath.substring(2)];
        }
        if (relativePath === "") {
            return `${sep}cfp`;
        }
        throw new Error(`Unhandled relativized path: ${relativePath}`);
    });

    // If no files to compare
    if (relChangedFilePaths.length === 0) return { ...directoryPolicy, isPolicyMet: false, matchingFiles: [] };

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

    // Build set of unique results
    const uniqueCodeCaptains = new Set(metPolicies.flatMap((policy) => policy.codeCaptains));
    const uniquePolicyFiles = new Set(metPolicies.map((policy) => policy.sourceFilePath));

    return {
        codeCaptains: uniqueCodeCaptains,
        metPolicyFilePaths: uniquePolicyFiles,
    };
};
