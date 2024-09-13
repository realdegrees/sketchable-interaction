import { Editor, JsonObject, T, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginAttachment } from "../base";
import { readFile } from "fs/promises";
import { z } from "zod";
import { FileData } from "../file/plugin";

const FolderDataSchema = z.object({
  startIn: z.string().optional(),
  parentId: z.custom<TLShapeId>(),
});
export type FolderData = z.infer<typeof FolderDataSchema>;

type ItemShapeMap = Map<TLShapeId, PluginAttachment>;
// TODO add code to receive and store handles for each existing
export class FolderPlugin extends BasePlugin<FolderData> {
  public async onCollisionEnd(
    editor: Editor,
    self: { shape: TLShape; data?: FolderData },
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
  private handleMap: Map<
    TLShapeId,
    {
      files: FileSystemFileHandle[];
      directories: FileSystemDirectoryHandle[];
      directory: FileSystemDirectoryHandle;
    }
  > = new Map();

  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: FolderData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only react to file shapes

    const fileData = colliding.plugin.properties.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;
    const { sourceShape, extension, name, dir } = fileData ?? {};

    if (!sourceShape || sourceShape === self.shape.id) {
      // trigger the deletion of the shape but make sure it doesn't get deleted as a file but instead
      return;
    }

    // TODO add utility function to retrieve colliding handles for re-use with other plugins
    const selfDirectoryHandle = this.handleMap.get(self.shape.id)?.directory;
    const collidingDirectoryHandle =
      sourceShape && this.handleMap.get(sourceShape)?.directory;
    const file =
      dir && sourceShape
        ? await this.handleMap
            .get(sourceShape)
            ?.files.find(({ name: fname }) => `${name}.${extension}` === fname)
            ?.getFile()
        : undefined;

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
    
    editor.updateShape({
      ...colliding.shape,
      opacity: 0
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
        editor.updateShape({
          ...colliding.shape,
          opacity: 100,
        });
        console.warn(
          "Unable to delete file after transfer\n",
          `Sourceshape: ${sourceShape}\n`,
          `Targetshape: ${self.shape.id}\n`,
          `File: ${dir}/${name}/${extension}`
        );
      }
    })();
  }

  // Signature for getting the parent directory handle
  public getHandle(shapeId: TLShapeId): FileSystemDirectoryHandle | undefined;
  // Signature for getting a subdirectory handle
  public getHandle(
    shapeId: TLShapeId,
    name?: string
  ): FileSystemDirectoryHandle | undefined;
  // Signature for getting a file handle
  public getHandle(
    shapeId: TLShapeId,
    name: string | undefined,
    extension: string | undefined
  ): FileSystemFileHandle | undefined;
  // Implementation
  public getHandle(
    shapeId: TLShapeId,
    name?: string,
    extension?: string
  ): FileSystemHandle | undefined {
    const { directories, files, directory } =
      this.handleMap.get(shapeId ?? ("" as TLShapeId)) ?? {};

    if (!name) return directory;

    // merge directories and files and return the  filehandle that matches the arguments
    return [...(directories ?? []), ...(files ?? [])].find(
      ({ name: hname }) => {
        const [handleName, handleExtension] = hname.split(".");
        return (
          handleName === name && (!extension || extension === handleExtension)
        );
      }
    );
  }

  public async registerHandles(
    shapeId: TLShapeId,
    handles: {
      files: FileSystemFileHandle[];
      directories: FileSystemDirectoryHandle[];
    },
    directoryHandle: FileSystemDirectoryHandle
  ): Promise<void> {
    this.handleMap.set(shapeId, {
      files: handles.files,
      directories: handles.directories,
      directory: directoryHandle,
    });
  }

  // TODO add methods to delete/create/etc files via shapeId and filename (find the corresponding handle and manipulate the file)
  public unregisterHandles(shapeId: TLShapeId): void {
    this.handleMap.delete(shapeId);
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: JsonObject
  ): void {}
}

export default new FolderPlugin({
  id: "folder",
  useableAsTool: true,
  availableShapes: ["rect"],
  deletable: true,
  pluginDataSchema: FolderDataSchema,
  tickRate: 2000
});
