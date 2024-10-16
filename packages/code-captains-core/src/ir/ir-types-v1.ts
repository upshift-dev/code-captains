export const AllFiles = "all-files" as const;

export type ChangedFileFilter = {
    includePatterns: string[] | typeof AllFiles;
    excludePatterns: string[];
};

export type CodeCaptain = string;

export type DirectoryPolicy = {
    sourceFilePath: string;
    fileFilter: ChangedFileFilter;
    codeCaptains: CodeCaptain[];
    // May need this to support CODEOWNERs file behavior on conflicts
    // propagateToChildren: boolean
};

export type RepoPolicy = {
    directoryPolicies: DirectoryPolicy[];
    // Any repo-wide config can go here
};
