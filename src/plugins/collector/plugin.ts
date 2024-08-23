import { Editor, TLArrowShape, TLShape, Vec } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";

class Plugin extends BasePlugin {
  private filterMap = new Map(); // TODO create methods to set filter options (for collector shape id) on collision these can the be evaluated by the plugin and sent to the appropriate shape on the canvas)
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
  ): void {
    // Check if colliding shape is a collector and only connect if it is
    const plugin = unwrapShape(colliding.shape)?.plugin;
    if(plugin?.id === this.id) {
      // TODO only allow shapes to connect if they are not already being connected to themselves
      this.connectShape(self.shape.id, colliding.shape.id, editor);
    }

    if(plugin?.id !== 'file') return;

    const {name, extension} = colliding.data?.attachments?.[0] ?? {};

    // look through all connectedshapes
  }
  public onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      data?: PluginData;
    }
  ): void {
    
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(shapeId: string, data?: PluginData): void {}
}

export default new Plugin({
  id: "collector",
  availableShapes: ["rect"],
  useableAsTool: true,
});
