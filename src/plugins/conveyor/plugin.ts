import { Editor, TLShape } from "tldraw";
import BasePlugin, { PluginData } from "../base";

class Plugin extends BasePlugin {
  public onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      data?: PluginData;
    },
    source: "user" | "plugin"
  ): void {
    // ? Just delete the shape, everything else like file deletion will be handled by the plugin associated with the deleted shape which receives an onDelete event
    editor.deleteShape(colliding.shape);
  }
  public onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      data?: PluginData;
    },
    source: "user" | "plugin"
  ): void {}
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(shapeId: string, data?: PluginData): void {}
}

export default new Plugin({
  id: "conveyor",
  availableShapes: ["conveyor"],
  useableAsTool: true,
});
