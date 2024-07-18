import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { readFile } from "fs/promises";

// TODO add code to receive and store handles for each existing
class Plugin extends BasePlugin {
  private handles: Map<
    TLShapeId,
    {
      files: Map<string, FileSystemFileHandle>;
      directory: FileSystemDirectoryHandle;
    }
  > = new Map();
  public async onCollision(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: PluginData;
    },
    source: "user" | "plugin"
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only react to file shapes

    const { sourceShape, fullPath, extension, name } =
      colliding.data?.files?.[0] ?? {};

    if (sourceShape === self.shape.id) return; // Ignore own fileshapes

    // TODO add utility function to retrieve colliding handles for re-use with other plugins
    const selfDirectoryHandle = this.handles.get(self.shape.id)?.directory;
    const collidingDirectoryHandle = sourceShape
      ? this.handles.get(sourceShape)?.directory
      : undefined;
    const file = fullPath && sourceShape
      ? await this.handles.get(sourceShape)?.files.get(fullPath)?.getFile()
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

  public getFileHandle(
    shapeId?: TLShapeId,
    path?: string
  ): FileSystemFileHandle | undefined {
    return this.handles
      .get(shapeId ?? ("" as TLShapeId))
      ?.files.get(path ?? "");
  }
  public getDirectoryHandle(
    shapeId?: TLShapeId
  ): FileSystemDirectoryHandle | undefined {
    return this.handles.get(shapeId ?? ("" as TLShapeId))?.directory;
  }
  public registerHandles(
    shapeId: TLShapeId,
    handles: Map<string, FileSystemFileHandle>,
    directoryHandle: FileSystemDirectoryHandle
  ): void {
    this.handles.set(shapeId, {
      files: handles,
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
});
