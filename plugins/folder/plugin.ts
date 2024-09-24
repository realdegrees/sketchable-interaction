import { JsonObject, TLArrowShape, TLShape, TLShapeId, Vec } from "tldraw";
import BasePlugin, { PluginConfig } from "../base";
import { FolderData } from "./config";
import { FileData } from "../file/config";
import { PluginUtil } from "@/util/pluginUtil";
import { transferFileWithWebWorker } from "@/util/fileTransfer";
import { SpawnFileArgs } from "./component";
import { getArrowCoordinates } from "@/util/collision";

export default class FolderPlugin extends BasePlugin<FolderData> {
  public constructor(config: PluginConfig, shape: TLShape) {
    super(config, shape);

    this.on("tick", () => {
      if (!this.editor) return;

      const selectedShapes = this.editor.getSelectedShapes();
      const isFolderSelected = selectedShapes?.find(
        ({ id }) => id === shape.id
      );
      // Don't act if the folder shape is currently selected
      if (isFolderSelected) return;

      const connectedConveyor = this.editor
        .getArrowsBoundTo(shape.id)
        .find(({ arrowId, handleId }) => {
          const plugin = PluginUtil.getPlugin(arrowId);
          return plugin?.id === 'conveyor' && handleId === "start";
        });
      const isConveyorSelected =
        connectedConveyor &&
        selectedShapes?.find(({ id }) => id === connectedConveyor.arrowId);

      // Don't act if the conveyor is selected
      if (!connectedConveyor || isConveyorSelected) return;

      this.emit("spawnFile", {
        connectedConveyorId: connectedConveyor?.arrowId,
      });
    });
  }
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
      }).then((success) => {});
  }

  public spawnFile(args: SpawnFileArgs): Promise<TLShapeId | undefined> {
    return new Promise((res) => {
      this.emit("spawnfile", args);
      this.on("filespawncallback", res);
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
