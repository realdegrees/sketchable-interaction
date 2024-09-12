import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin from "../base";
import { z } from "zod";

const FileDataSchema = z.object({
  dir: z.string(),
  extension: z.string().optional(),
  name: z.string().optional(),
  sourceShape: z.custom<TLShapeId>(),
});
export type FileData = z.infer<typeof FileDataSchema>;

class Plugin extends BasePlugin<FileData> {
  public async onCollisionEnd(
    editor: Editor,
    self: { shape: TLShape; data?: FileData },
    colliding: { shape: TLShape; plugin: BasePlugin<unknown>; data?: unknown }
  ): Promise<void> {}
  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: FileData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin<unknown>;
      data?: unknown;
    }
  ): Promise<void> {}
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: FileData
  ): void {}
}

export default new Plugin({
  id: "file",
  availableShapes: ["rect"],
  useableAsTool: false,
  onlyCustomComponent: true,
  moveable: true,
  deletable: true,
  pluginDataSchema: FileDataSchema
});
