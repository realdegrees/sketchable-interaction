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

    const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;

    this.emit("collisionstart", fileData);
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

    this.emit("collisionend");
  }
  public onDelete(): void {}
}
