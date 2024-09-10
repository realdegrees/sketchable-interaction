import { Editor, TLShape, TLShapeId } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import { FolderPlugin } from "../folder/plugin";

class Plugin extends BasePlugin {
  public onCollisionEnd(
    editor: Editor,
    self: { shape: TLShape; data?: PluginData },
    colliding: { shape: TLShape; plugin: BasePlugin; data?: PluginData }
  ): void {}
  public onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      data?: PluginData;
    }
  ): void {}
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: PluginData): void {
    // const deleteFilesOnHostSystem = true; // TODO: Extract this variable to planned settings store and access it from there
    // if(!deleteFilesOnHostSystem) return;
    // const {dir, sourceShape, extension, name} = data?.attachments?.[0] ?? {};
    // const {plugin: folderPlugin} = unwrapShape(editor.getShape(sourceShape as TLShapeId)) ?? {};

    // const parentDirectoryHandle = (folderPlugin as FolderPlugin).getHandle(sourceShape as TLShapeId);
    // parentDirectoryHandle?.removeEntry(`${name}.${extension}`);
    // get folder plugin instance of the sourceshape prop of data
    // ? in base.ts create a system to reference "connected" shapes (e.g. files to folders)
    // Create functionality to inform plugin if any connected shapes are deleted
    // create event in plugin that the component can optionally listen to to also get informed
  }
}

export default new Plugin({
  id: "file",
  availableShapes: ["rect"],
  useableAsTool: false,
  onlyCustomComponent: true,
  moveable: true,
  deletable: true
});
