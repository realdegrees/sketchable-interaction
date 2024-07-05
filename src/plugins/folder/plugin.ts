import { Editor, TLShape } from "tldraw";
import BasePlugin, { PluginData } from "../base";

type ShapeID = string;
// TODO add code to receive and store handles for each existing
class Plugin extends BasePlugin {
  private handles: Map<ShapeID, Map<string, FileSystemHandle>> = new Map();
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
  ): void {}

  public registerHandles(
    shapeId: ShapeID,
    handles: Map<string, FileSystemHandle>
  ): void {
    this.handles.set(shapeId, handles);
  }

  // TODO add methods to delete/create/etc files via shapeId and filename (find the corresponding handle and manipulate the file)
  public unregisterHandles(shapeId: ShapeID): void {
    this.handles.delete(shapeId);
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(shapeId: string, data?: PluginData): void {}
}

export default new Plugin({
  id: "folder",
  selectable: true,
  availableShapes: ["rect"],
});
