import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginAttachment, PluginData } from "../base";
import { readFile } from "fs/promises";

type ItemShapeMap = Map<TLShapeId, PluginAttachment>;
// TODO add code to receive and store handles for each existing
export class FolderPlugin extends BasePlugin {
  public onCollisionEnd(
    editor: Editor,
    self: { shape: TLShape; data?: PluginData },
    colliding: { shape: TLShape; plugin: BasePlugin; data?: PluginData }
  ): void {}

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
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: PluginData;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only react to file shapes

    const { sourceShape, dir, extension, name } =
      colliding.data?.attachments?.[0] ?? {};

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

    const newFileHandle = await selfDirectoryHandle.getFileHandle(
      `${name}.${extension}`,
      {
        create: true,
      }
    );

    const writeable = await newFileHandle.createWritable();
    await writeable.write(file);
    await writeable.close();
    await collidingDirectoryHandle.removeEntry(`${name}.${extension}`);

    editor.deleteShape(colliding.shape.id);
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
    data?: PluginData
  ): void {}
}

export default new FolderPlugin({
  id: "folder",
  useableAsTool: true,
  availableShapes: ["rect"],
  deletable: true,
});
