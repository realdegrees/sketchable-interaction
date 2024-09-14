import { z } from "zod";
import { PluginConfig } from "../base";
import { TLShapeId } from "tldraw";

export const FileDataSchema = z.object({
  dir: z.string(),
  extension: z.string().optional(),
  name: z.string().optional(),
  sourceShape: z.custom<TLShapeId>(),
});
export type FileData = z.infer<typeof FileDataSchema>;

export default {
  id: "file",
  availableShapes: ["rect"],
  useableAsTool: false,
  onlyCustomComponent: true,
  moveable: true,
  deletable: true,
  pluginDataSchema: FileDataSchema,
} as PluginConfig;
