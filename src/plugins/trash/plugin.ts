import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";

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
    }
  ): void {
    const deletable = !!unwrapShape(colliding.shape)?.plugin.properties
      .deletable;
    if (deletable) {
      // ? Just delete the shape, everything else like file deletion will be handled by the plugin associated with the deleted shape which receives an onDelete event
      editor.deleteShape(colliding.shape);
    }
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
    }
  ): void {}
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: PluginData): void {}
}

export default new Plugin({
  id: "trash",
  availableShapes: ["rect"],
  useableAsTool: true,
});
