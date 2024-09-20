import { z } from "zod";
import { PluginConfig } from "../base";

export const CopyDataSchema = z.object({});
export type CopyData = z.infer<typeof CopyDataSchema>;

export default {
  id: "copy",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: CopyDataSchema,
} as PluginConfig;
