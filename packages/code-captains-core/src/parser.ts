import { promises as fs } from "fs";

import { parse } from "yaml";
import { ZodSchema } from "zod";

import { directorySpecSchema } from "./spec/directory-spec-v1.js";

const parseYamlFileUnsafe = async <T>(filePath: string, schema: ZodSchema<T>) => {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const data = parse(fileContent);
    return schema.parse(data);
};

const directoryFileToDirectoryPolicy = async (filePath: string) => {
    const directorySpec = await parseYamlFileUnsafe(filePath, directorySpecSchema);
    return {
        sourceFilePath: filePath,
        fileFilter: {
            include: directorySpec.include == null ? "all-files" : directorySpec.include,
            exclude: directorySpec.exclude == null ? [] : directorySpec.exclude,
        },
        codeCaptains: directorySpec.captains,
    };
};

export const filesToIr = async (directoryFilePaths: string[]) => {
    return {
        directoryPolicies: await Promise.all(directoryFilePaths.map((dfp) => directoryFileToDirectoryPolicy(dfp))),
    };
};
