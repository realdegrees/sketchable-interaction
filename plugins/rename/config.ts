import { z } from "zod";
import { PluginConfig } from "../base";
import { Z_TEXT } from "zlib";

export const RenameDataSchema = z.object({
  pattern: z.string().nullish(),
  replace: z.string().nullish()
});
export type RenameData = z.infer<typeof RenameDataSchema>;

export default {
  id: "rename",
  label: "Rename",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: RenameDataSchema,
} as PluginConfig;