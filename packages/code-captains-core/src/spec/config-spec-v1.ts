import { z } from "zod";

export const configSpecSchema = z.object({});

export type ConfigSpec = z.infer<typeof configSpecSchema>;
