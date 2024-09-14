import { JsonObject, TLShape } from "tldraw";
import BasePlugin from "../base";
import { TextEditorData } from "./config";
import { FileData } from "../file/config";

export default class TextEditorPlugin extends BasePlugin<TextEditorData> {
  public async onCollisionStart(
    data: TextEditorData | undefined,
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

    this.connectShape(colliding.shape.id, true);
    this.emit("collisionstart", fileData);
  }
  public async onCollisionEnd(
    data: TextEditorData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only switch editor UI when colliding with files

    this.disconnectShape(colliding.shape.id);
this.emit("collisionend");  }
}
