import { promises as fs } from "fs";

import { parse } from "yaml";
import { ZodSchema } from "zod";

import { AllFiles, RepoPolicy } from "./ir/ir-types-v1.js";
import { directorySpecSchema } from "./spec/directory-spec-v1.js";

const parseYamlFileUnsafe = async <T>(filePath: string, schema: ZodSchema<T>) => {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const data = parse(fileContent);
    return schema.parse(data);
};

const directoryFileToDirectoryPolicies = async (filePath: string) => {
    const directorySpec = await parseYamlFileUnsafe(filePath, directorySpecSchema);
    return directorySpec.policies.map((policy) => ({
        sourceFilePath: filePath,
        fileFilter: {
            includePatterns: policy.include == null ? AllFiles : policy.include,
            excludePatterns: policy.exclude == null ? [] : policy.exclude,
        },
        codeCaptains: policy.captains,
    }));
};

export const filesToIr = async (directoryFilePaths: string[]): Promise<RepoPolicy> => {
    return {
        directoryPolicies: (
            await Promise.all(directoryFilePaths.map((dfp) => directoryFileToDirectoryPolicies(dfp)))
        ).flat(),
    };
};
