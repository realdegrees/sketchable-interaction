import { Editor, JsonObject, TLShape } from "tldraw";
import BasePlugin from "../base";
import { PluginUtil } from "@/util/pluginUtil";
import { MagnifyData } from "./config";
import { FileData } from "../file/config";


export default class MagnifyPlugin extends BasePlugin<MagnifyData> {
  public async onCollisionStart(
    data: MagnifyData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const { plugin } = PluginUtil.unwrapShape(colliding.shape) ?? {};
    if (!plugin || plugin.id !== "file") return; // Only switch UI when colliding with files
    if (this.connectedShapes.size === 1) return; // Display only the first file that collided

    const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;

    this.connectShape(colliding.shape.id);
    this.emit("file", fileData);
  }
  public async onCollisionEnd(
    data: MagnifyData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only switch editor UI when colliding with files

    if(!this.connectedShapes.has(colliding.shape.id)) return;
    this.disconnectShape(colliding.shape.id);
    this.emit("end");
  }
  public onDelete(): void {}
}
