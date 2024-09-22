import { JsonObject, TLShape, TLShapeId } from "tldraw";
import BasePlugin from "../base";
import { FolderData } from "./config";
import { FileData } from "../file/config";
import { PluginUtil } from "@/util/pluginUtil";
import FilePlugin from "../file/plugin";
import { transferFileWithWebWorker } from "@/util/fileTransfer";

export default class FolderPlugin extends BasePlugin<FolderData> {
  public async onCollisionEnd(
    data: FolderData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {}

  public handles:
    | {
        files: FileSystemFileHandle[];
        directories: FileSystemDirectoryHandle[];
        directory: FileSystemDirectoryHandle;
      }
    | undefined;

  public async onCollisionStart(
    data: FolderData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin<FileData>; // can cast to FilePlugin because we only handle files
      data?: FileData;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only react to file shapes

    const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;
    const { sourceShape, extension, name, dir } = fileData ?? {};

    if (!fileData || !sourceShape || sourceShape === this.shape.id) {
      return;
    }
    const sourceFolderPlugin = PluginUtil.getPlugin<FolderPlugin>(sourceShape);

    const selfDirectoryHandle = this.handles?.directory;
    const collidingDirectoryHandle = sourceFolderPlugin?.handles?.directory;
    const file = await sourceFolderPlugin?.handles?.files
      .find(({ name: fname }) => fname === `${name}.${extension}`)
      ?.getFile();

    if (
      !file ||
      !selfDirectoryHandle ||
      !collidingDirectoryHandle ||
      !name ||
      !extension
    ) {
      console.warn("Unable to handle file movement!");
      return;
    }

    // this.editor!.updateShape({
    //   ...colliding.shape,
    //   opacity: 0,
    // });

    // ! Start webworker
    console.log("Starting webworker");
    this.editor?.deleteShape(colliding.shape.id);
    const fileHandle = PluginUtil.getPlugin<FolderPlugin>(
      sourceShape
    )?.handles?.files.find(
      ({ name: fname }) => fname === `${name}.${extension}`
    );

    fileHandle &&
      transferFileWithWebWorker({
        fileHandle,
        sourceDir: collidingDirectoryHandle,
        targetDir: selfDirectoryHandle,
      }).then((success) => {
        console.log(success ? 'File transferred' : 'File transfer failed');
      });

  }

  public async registerHandles(
    handles: {
      files: FileSystemFileHandle[];
      directories: FileSystemDirectoryHandle[];
    },
    directoryHandle: FileSystemDirectoryHandle
  ): Promise<void> {
    this.handles = {
      ...handles,
      directory: directoryHandle,
    };
  }

  public unregisterHandles(shapeId: TLShapeId): void {
    this.handles = undefined;
  }
  public onDelete(): void {}
}
