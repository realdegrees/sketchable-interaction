import { Editor, TLShape } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import properties from "./properties";

class Trash extends BasePlugin {
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
    source: "user" | "tool"
  ): void {
    // ? Just delete the shape, everything else like file deletion will be handled by the plugin associated with the deleted shape which receives an onDelete event
    editor.deleteShape(colliding.shape);
  }
  public onCreate(shape: TLShape): void {}
  public onDelete(data?: PluginData): void {}
}

export default new Trash(properties);
