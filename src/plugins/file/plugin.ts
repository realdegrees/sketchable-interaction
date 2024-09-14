import { TLShape } from "tldraw";
import BasePlugin from "../base";
import { FileData } from "./config";


export default class FilePlugin extends BasePlugin<FileData> {
  public async onCollisionEnd(
    data: FileData | undefined,
    colliding: { shape: TLShape; plugin: BasePlugin<unknown>; data?: unknown }
  ): Promise<void> {}
  public async onCollisionStart(
    data: FileData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin<unknown>;
      data?: unknown;
    }
  ): Promise<void> {}
  public onDelete(): void {}
}
