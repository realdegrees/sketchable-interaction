import { JsonObject, T, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginAttachment } from "../base";
import { FolderData } from "./config";
import { FileData } from "../file/config";
import { PluginUtil } from "@/util/pluginUtil";
import FilePlugin from "../file/plugin";

type ItemShapeMap = Map<TLShapeId, PluginAttachment>;
// TODO add code to receive and store handles for each existing
export default class FolderPlugin extends BasePlugin<FolderData> {
  public async onCollisionEnd(
    data: FolderData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {}

  private _detachedMap: Map<TLShapeId, ItemShapeMap> = new Map();

  public get detachedMap(): Map<TLShapeId, ItemShapeMap> {
    return this._detachedMap;
  }

  public setDetachedItems(folderShapeId: TLShapeId, itemMap: ItemShapeMap) {
    this._detachedMap.set(folderShapeId, itemMap);
  }
  public addDetachedItem(
    folderShapeId: TLShapeId,
    itemShapeId: TLShapeId,
    item: PluginAttachment
  ) {
    this._detachedMap.set(
      folderShapeId,
      (this._detachedMap.get(folderShapeId) ?? new Map()).set(itemShapeId, item)
    );
  }
  public removeDetachedItem(folderShapeId: TLShapeId, itemShapeId: TLShapeId) {
    this._detachedMap.get(folderShapeId)?.delete(itemShapeId);
  }
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
      plugin: FilePlugin; // can cast to FilePlugin because we only handle files
      data?: FileData;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only react to file shapes

    const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;
    const { sourceShape, extension, name, dir } = fileData ?? {};

    const sourceFolderPlugin = PluginUtil.getPlugin<FolderPlugin>(
      colliding.shape.id
    );
    if (!sourceShape || sourceShape === this.shape.id) {
      // trigger the deletion of the shape but make sure it doesn't get deleted as a file but instead
      return;
    }

    // TODO add utility function to retrieve colliding handles for re-use with other plugins
    const selfDirectoryHandle = this.handles?.directory;
    const collidingDirectoryHandle = sourceFolderPlugin?.handles?.directory;
    const file = await sourceFolderPlugin?.handles?.files
      .find(({ name: fname }) => fname === name)
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

    this.editor!.updateShape({
      ...colliding.shape,
      opacity: 0,
    });

    // Don't wait for this as it clogs up the system
    (async () => {
      let transferSuccess = false;
      let tries = 0;
      const maxTries = 100;
      const timeout = 500;

      do {
        try {
          const newFileHandle = await selfDirectoryHandle.getFileHandle(
            `${name}.${extension}`,
            {
              create: true,
            }
          );

          const writeable = await newFileHandle.createWritable();
          await writeable.write(file);
          await writeable.close();
          transferSuccess = true;
        } catch (e) {
          console.debug(`File transfer failed retrying in ${timeout}ms\n`, e);
          await new Promise((res) => setTimeout(res, timeout));
          tries++;
        }
      } while (!transferSuccess && tries <= maxTries);

      if (transferSuccess) {
        console.debug("File transferred\n", `${dir}/${name}.${extension}`);
        let deleteSuccess = false;
        tries = 0;
        do {
          try {
            await collidingDirectoryHandle.removeEntry(`${name}.${extension}`);
            deleteSuccess = true;
          } catch (e) {
            console.debug(`File deletion failed retrying in ${timeout}ms`);
            await new Promise((res) => setTimeout(res, timeout));
            tries++;
          }
        } while (!deleteSuccess && tries <= maxTries);
      } else {
        this.editor!.updateShape({
          ...colliding.shape,
          opacity: 100,
        });
        console.warn(
          "Unable to delete file after transfer\n",
          `Sourceshape: ${sourceShape}\n`,
          `Targetshape: ${this.shape.id}\n`,
          `File: ${dir}/${name}/${extension}`
        );
      }
    })();
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

  // TODO add methods to delete/create/etc files via shapeId and filename (find the corresponding handle and manipulate the file)
  public unregisterHandles(shapeId: TLShapeId): void {
    this.handles = undefined;
  }
  public onDelete(): void {}
}
