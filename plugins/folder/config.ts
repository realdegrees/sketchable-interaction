import { TLShapeId } from "tldraw";
import { z } from "zod";
import { PluginConfig } from "../base";

export const FolderDataSchema = z.object({
  startIn: z.string().optional(),
  parentId: z.custom<TLShapeId>(),
});
export type FolderData = z.infer<typeof FolderDataSchema>;


export default {
  id: "folder",
  useableAsTool: true,
  availableShapes: ["rect"],
  deletable: true,
  pluginDataSchema: FolderDataSchema,
  tickRate: 1500
} as PluginConfig;