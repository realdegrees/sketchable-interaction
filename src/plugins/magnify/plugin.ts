import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { ShapeMeta } from "@/components/tlwrap";

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
    const meta = structuredClone(colliding.shape.meta) as ShapeMeta;
    meta.data.state = meta.data.state ?? {};
    meta.data.state.activeEffects = ['magnify', ...meta.data.state.activeEffects];
    editor.updateShape({
        ...colliding.shape,
        meta
    })
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
  ): void {
    const meta = structuredClone(colliding.shape.meta) as ShapeMeta;
    meta.data.state = meta.data.state ?? {};
    meta.data.state.activeEffects = meta.data.state.activeEffects.filter((v) => v !== 'magnify');
    editor.updateShape({
        ...colliding.shape,
        meta
    })
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(shapeId: TLShapeId, data?: PluginData): void {}
}

export default new Plugin({
  id: "magnify",
  availableShapes: ["rect"],
  useableAsTool: true,
});
