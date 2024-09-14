import { z } from "zod";
import { PluginConfig } from "../base";

export const TextEditorDataSchema = z.object({});
export type TextEditorData = z.infer<typeof TextEditorDataSchema>;

export default {
  id: "texteditor",
  label: "Text Edtior",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: TextEditorDataSchema,
} as PluginConfig;