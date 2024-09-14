import { z } from "zod";
import { PluginConfig } from "../base";

export const CollectorDataSchema = z.object({
  Name: z.string(),
  Mediatype: z.string(),
  "Extension(s)": z.string(),
  "Size Max (MB)": z.string(),
  "Size Min (MB)": z.string(),
});
export type CollectorData = z.infer<typeof CollectorDataSchema>;

export default {
  id: "collector",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: CollectorDataSchema,
} as PluginConfig;
