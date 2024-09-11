import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import { FolderPlugin } from "../folder/plugin";

class Plugin extends BasePlugin {
  public onCollisionEnd(
    editor: Editor,
    self: { shape: TLShape; data?: PluginData },
    colliding: { shape: TLShape; plugin: BasePlugin; data?: PluginData }
  ): void {}
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
  ): void {}
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: PluginData): void {  }
}

export default new Plugin({
  id: "file",
  availableShapes: ["rect"],
  useableAsTool: false,
  onlyCustomComponent: true,
  moveable: true,
  deletable: true
});
