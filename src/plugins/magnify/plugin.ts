import { Editor, JsonObject, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { z } from "zod";

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
  ): Promise<void> {}
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
  ): Promise<void> {}
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: PluginData
  ): void {}
}

export default new Plugin({
  id: "magnify",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: MagnifyDataSchema
});
