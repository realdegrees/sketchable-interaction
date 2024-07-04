import { Editor, TLShape } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import properties from "./properties";

class File extends BasePlugin {
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
  public onDelete(data?: PluginData): void {}
}

export default new File(properties);
