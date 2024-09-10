import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { ShapeMeta } from "@/components/tlwrap";
import { unwrapShape } from "@/util/pluginUtil";
import equal from "deep-equal";
import { getMimeType } from "@/util/getMimeType";

const mimeType = 'text';
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
    const { plugin } = unwrapShape(colliding.shape) ?? {};
    if (!plugin || plugin.id !== "file") return; // Only switch editor UI when colliding with files

    const meta = structuredClone(colliding.shape.meta) as ShapeMeta;
    const editData = meta.data.attachments?.find(
      ({ extension }) =>
        extension && getMimeType(extension)?.split("/")?.[0] === mimeType
    );
    if (!editData) return; // Only switch editor UI for images

    meta.data.state = meta.data.state ?? {};
    meta.data.state.activeEffects = ["edit", ...meta.data.state.activeEffects];

    // add file attachment as attachment to own shape to access it in the custom component and render the image
    editor.updateShape({
      ...self.shape,
      meta: {
        ...self.shape.meta,
        data: {
          state: {
            activeEffects: ["edit"],
          },
          attachments: [editData],
        },
      } as Partial<ShapeMeta>,
    });
    editor.updateShape({
      ...colliding.shape,
      meta,
    });
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
    const { plugin } = unwrapShape(colliding.shape) ?? {};
    if (!plugin || plugin.id !== "file") return; // Only switch editor UI when colliding with files

    const selfMeta = structuredClone(self.shape.meta) as ShapeMeta;
    const currentEditData = selfMeta.data.attachments?.[0];

    const meta = structuredClone(colliding.shape.meta) as ShapeMeta;
    const editData = meta.data.attachments?.find(
      ({ extension }) =>
        extension && getMimeType(extension)?.split("/")?.[0] === mimeType
    );

    if (!editData || !equal(currentEditData, editData)) return;

    meta.data.state = meta.data.state ?? {};
    meta.data.state.activeEffects = meta.data.state.activeEffects.filter(
      (v) => v !== "edit"
    );
    editor.updateShape({
      ...colliding.shape,
      meta,
    });

    // Remove file attachment from the own shape so custom UI removes the image
    editor.updateShape({
      ...self.shape,
      meta: {
        ...self.shape.meta,
        data: {
          state: {
            activeEffects: [],
          },
          attachments: [],
        },
      } as Partial<ShapeMeta>,
    });
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: PluginData): void {}
}

export default new Plugin({
  id: "texteditor",
  label: "Text Edtior",
  availableShapes: ["rect"],
  useableAsTool: true,
});
