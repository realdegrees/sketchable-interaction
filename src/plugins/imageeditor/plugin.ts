import { Editor, JsonObject, TLShape, TLShapeId } from "tldraw";
import BasePlugin from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import equal from "deep-equal";
import { getMimeType } from "@/util/getMimeType";
import { z } from "zod";
import { FileData } from "../file/plugin";

const ImageEditorDataSchema = z.object({});
export type ImageEditorData = z.infer<typeof ImageEditorDataSchema>;

const mimeType = "image";

class Plugin extends BasePlugin<ImageEditorData> {
  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: ImageEditorData;
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
    
    this.informCollisionListeners("file", self.shape.id, fileData);
  }
  public async onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: ImageEditorData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const { plugin } = unwrapShape(colliding.shape) ?? {};
    if (!plugin || plugin.id !== "file") return; // Only switch editor UI when colliding with files

    this.informCollisionListeners("end", self.shape.id, undefined);
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: JsonObject
  ): void {}
}

export default new Plugin({
  id: "imageeditor",
  label: "Image Edtior",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: ImageEditorDataSchema,
});
