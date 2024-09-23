import { z } from "zod";
import { PluginConfig } from "../base";

export const ImageEditorDataSchema = z.object({});
export type ImageEditorData = z.infer<typeof ImageEditorDataSchema>;

export default {
  id: "imageeditor",
  label: "Image Editor",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: ImageEditorDataSchema,
} as PluginConfig;