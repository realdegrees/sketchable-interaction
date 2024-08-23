import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { readFile } from "fs/promises";

// TODO add code to receive and store handles for each existing
class Plugin extends BasePlugin {
  public onCollisionEnd(
    editor: Editor,
    self: { shape: TLShape; data?: PluginData },
    colliding: { shape: TLShape; plugin: BasePlugin; data?: PluginData }
  ): void {}
  private handles: Map<
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

    if (sourceShape === self.shape.id) return; // Ignore own fileshapes

    // TODO add utility function to retrieve colliding handles for re-use with other plugins
    const selfDirectoryHandle = this.handles.get(self.shape.id)?.directory;
    const collidingDirectoryHandle = sourceShape
      ? this.handles.get(sourceShape)?.directory
      : undefined;
    const file =
      dir && sourceShape
        ? await this.handles
            .get(sourceShape)
            ?.files.find(({ name: fname }) => name === fname)
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
      this.handles.get(shapeId ?? ("" as TLShapeId)) ?? {};

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

  public registerHandles(
    shapeId: TLShapeId,
    handles: {
      files: FileSystemFileHandle[];
      directories: FileSystemDirectoryHandle[];
    },
    directoryHandle: FileSystemDirectoryHandle
  ): void {
    this.handles.set(shapeId, {
      files: handles.files,
      directories: handles.directories,
      directory: directoryHandle,
    });
  }

  // TODO add methods to delete/create/etc files via shapeId and filename (find the corresponding handle and manipulate the file)
  public unregisterHandles(shapeId: TLShapeId): void {
    this.handles.delete(shapeId);
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(shapeId: string, data?: PluginData): void {}
}

export default new Plugin({
  id: "folder",
  useableAsTool: true,
  availableShapes: ["rect"],
  deletable: true
});
