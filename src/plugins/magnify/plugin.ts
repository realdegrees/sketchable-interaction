import { Editor, JsonObject, TLShape, TLShapeId } from "tldraw";
import BasePlugin from "../base";
import { z } from "zod";
import { getMimeType } from "@/util/getMimeType";
import { unwrapShape } from "@/util/pluginUtil";
import { FileData } from "../file/plugin";

const MagnifyDataSchema = z.object({});
export type MagnifyData = z.infer<typeof MagnifyDataSchema>;

class Plugin extends BasePlugin<MagnifyData> {
  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: MagnifyData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const { plugin } = unwrapShape(colliding.shape) ?? {};
    if (!plugin || plugin.id !== "file") return; // Only switch UI when colliding with files

    const fileData = colliding.plugin.properties.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;
    
    this.informCollisionListeners("collision-start", self.shape.id, fileData);
  }
  public async onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: MagnifyData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const { plugin } = unwrapShape(colliding.shape) ?? {};
    if (!plugin || plugin.id !== "file") return; // Only switch editor UI when colliding with files

    this.informCollisionListeners("collision-end", self.shape.id, undefined);
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: MagnifyData
  ): void {}
}

export default new Plugin({
  id: "magnify",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: MagnifyDataSchema,
});
