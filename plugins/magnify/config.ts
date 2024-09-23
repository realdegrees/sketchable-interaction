import { z } from "zod";
import { PluginConfig } from "../base";

export const MagnifyDataSchema = z.object({});
export type MagnifyData = z.infer<typeof MagnifyDataSchema>;

export default {
  id: "magnify",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: MagnifyDataSchema,
}as PluginConfig;