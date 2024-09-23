import { z } from "zod";
import { PluginConfig } from "../base";

export const TrashDataSchema = z.object({
  delete: z.boolean(),
});
export type TrashData = z.infer<typeof TrashDataSchema>;

export default {
  id: "trash",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: TrashDataSchema,
} as PluginConfig;