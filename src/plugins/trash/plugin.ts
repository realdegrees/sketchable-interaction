import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import { FolderPlugin } from "../folder/plugin";

export type TrashSettings = {
  delete: boolean;
};
export class TrashPlugin extends BasePlugin {
  private trashSettingsMap: Map<TLShapeId, TrashSettings> = new Map();

  public setTrashSettings(shapeId: TLShapeId, settings: TrashSettings): void {
    this.trashSettingsMap.set(shapeId, settings);
  }

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
    if (!deletable) return;
    if (!this.trashSettingsMap.get(self.shape.id)?.delete) {
      editor.deleteShape(colliding.shape);
      return;
    }

    const { sourceShape, extension, name } =
      colliding.data?.attachments?.[0] ?? {};
    const { plugin: folderPlugin } =
      unwrapShape(editor.getShape(sourceShape as TLShapeId)) ?? {};

    const parentDirectoryHandle = (folderPlugin as FolderPlugin).getHandle(
      sourceShape as TLShapeId
    );
    parentDirectoryHandle?.removeEntry(`${name}.${extension}`);
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
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: PluginData): void {
    this.trashSettingsMap.delete(shapeId);
  }
}

export default new TrashPlugin({
  id: "trash",
  availableShapes: ["rect"],
  useableAsTool: true,
});
