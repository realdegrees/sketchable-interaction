import { Editor, TLShape } from "tldraw";
import BasePlugin, { PluginData } from "../base";

class Plugin extends BasePlugin {
  public onCollision(
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
    
  }
  public onCreate(editor: Editor, shape: TLShape): void {
    
  }
  public onDelete(shapeId: string, data?: PluginData): void {
  }
}

export default new Plugin({
  id: "file",
  availableShapes: ["rect"],
  useableAsTool: false,
});
