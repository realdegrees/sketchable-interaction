import { JsonObject, TLShape } from "tldraw";
import BasePlugin from "../base";
import { ImageEditorData } from "./config";
import { FileData } from "../file/config";

export default class Plugin extends BasePlugin<ImageEditorData> {
  public async onCollisionStart(
    data: ImageEditorData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only switch editor UI when colliding with files

    const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;

    this.emit("collisionstart", fileData);
  }
  public async onCollisionEnd(
    data: ImageEditorData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only switch editor UI when colliding with files

    this.emit("collisionend");
  }
  public onDelete(): void {}
}
