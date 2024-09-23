import { JsonObject, TLShape, TLShapeId } from "tldraw";
import BasePlugin from "../base";
import { PluginUtil } from "@/util/pluginUtil";
import { TrashData } from "./config";
import { FolderData } from "../folder/config";
import { FileData } from "../file/config";
import FolderPlugin from "../folder/plugin";

export default class TrashPlugin extends BasePlugin<TrashData> {
  public async onCollisionStart(
    data: TrashData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (!colliding.plugin?.config.deletable) return;

    if (!data?.delete) {
      this.editor!.deleteShape(colliding.shape);
      return;
    }

    if (colliding.plugin.id === 'file') {
      const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
        colliding.data
      ).data as JsonObject as FileData | undefined;
      const { sourceShape, extension, name } = fileData ?? {};

      const folderPlugin =
        sourceShape && PluginUtil.getPlugin<FolderPlugin>(sourceShape);

      const parentDirectoryHandle = folderPlugin?.handles?.directory;
      await parentDirectoryHandle?.removeEntry(`${name}.${extension}`);
      this.editor?.deleteShape(colliding.shape);
    }else if(colliding.plugin.id === 'folder') {
      const folderData = colliding.plugin.config.pluginDataSchema.safeParse(
        colliding.data
      ).data as JsonObject as FolderData | undefined;
      const { parentId, startIn } = folderData ?? {};


      const folderPlugin =
        parentId && PluginUtil.getPlugin<FolderPlugin>(parentId);

      const parentDirectoryHandle = folderPlugin?.handles?.directory;
      await parentDirectoryHandle?.removeEntry(`${startIn}`);
      this.editor?.deleteShape(colliding.shape);
    }
  }
  public async onCollisionEnd(): Promise<void> {}
}
