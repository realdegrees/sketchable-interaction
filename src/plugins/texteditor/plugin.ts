import { Editor, JsonObject, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import equal from "deep-equal";
import { getMimeType } from "@/util/getMimeType";
import { z } from "zod";
import { FileData } from "../file/plugin";

const TextEditorDataSchema = z.object({});
export type TextEditorData = z.infer<typeof TextEditorDataSchema>;


const mimeType = 'text';
class Plugin extends BasePlugin<TextEditorData> {
  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: TextEditorData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const { plugin } = unwrapShape(colliding.shape) ?? {};
    if (!plugin || plugin.id !== "file") return; // Only switch editor UI when colliding with files

    const fileData = colliding.plugin.properties.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;
    const { sourceShape, extension, name, dir } = fileData ?? {};

    if (
      !fileData ||
      !extension ||
      getMimeType(extension) !== mimeType
    ) {
      return; // Only switch editor UI for images
    }
  }
  public async onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: TextEditorData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const { plugin } = unwrapShape(colliding.shape) ?? {};
    if (!plugin || plugin.id !== "file") return; // Only switch editor UI when colliding with files

    this.disconnectShape(self.shape.id, colliding.shape.id, editor);
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: PluginData
  ): void {}
}

export default new Plugin({
  id: "texteditor",
  label: "Text Edtior",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: TextEditorDataSchema
});
