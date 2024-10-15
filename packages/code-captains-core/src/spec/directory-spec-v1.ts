import { z } from "zod";

export const directorySpecSchema = z.object({
    include: z.array(z.string()).optional(), // Undefined means include all files
    exclude: z.array(z.string()).optional(), // Undefined means no excludes
    captains: z.array(z.string()),
});

export type DirectorySpec = z.infer<typeof directorySpecSchema>;
