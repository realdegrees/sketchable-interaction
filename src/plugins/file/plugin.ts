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
    // get folder plugin instance of the sourceshape prop of data
    // ? in base.ts create a system to reference "connected" shapes (e.g. files to folders)
    // Create functionality to inform plugin if any connected shapes are deleted
    // create event in plugin that the component can optionally listen to to also get informed
  }
}

export default new Plugin({
  id: "file",
  availableShapes: ["rect"],
  useableAsTool: false,
  onlyCustomComponent: true
});
