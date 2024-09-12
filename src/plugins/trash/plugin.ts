import { Editor, JsonObject, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import plugin, { FolderPlugin } from "../folder/plugin";
import { z } from "zod";
import { FileData } from "../file/plugin";

const TrashDataSchema = z.object({
  delete: z.boolean()
});
export type TrashData = z.infer<typeof TrashDataSchema>;

export type TrashSettings = {
  delete: boolean;
};
export class TrashPlugin extends BasePlugin<TrashData> {
  private trashSettingsMap: Map<TLShapeId, TrashSettings> = new Map();

  public setTrashSettings(shapeId: TLShapeId, settings: TrashSettings): void {
    this.trashSettingsMap.set(shapeId, settings);
  }

  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: TrashData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const deletable = !!unwrapShape(colliding.shape)?.plugin.properties
      .deletable;
    if (!deletable) return;
    if (!this.trashSettingsMap.get(self.shape.id)?.delete) {
      editor.deleteShape(colliding.shape);
      return;
    }

    const fileData = colliding.plugin.properties.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;
    const { sourceShape, extension, name } = fileData ?? {};
    const { plugin: folderPlugin } =
      unwrapShape(editor.getShape(sourceShape as TLShapeId)) ?? {};

    const parentDirectoryHandle = (folderPlugin as FolderPlugin).getHandle(
      sourceShape as TLShapeId
    );
    parentDirectoryHandle?.removeEntry(`${name}.${extension}`);
  }
  public async onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: TrashData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {}
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: PluginData): void {
    this.trashSettingsMap.delete(shapeId);
  }
}

export default new TrashPlugin({
  id: "trash",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: TrashDataSchema
});
