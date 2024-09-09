import { Editor, TLArrowShape, TLShape, TLShapeId, Vec } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import { FilterSettings, FilterType } from "./component";

class Plugin extends BasePlugin {
  private filterMap: Map<TLShapeId, FilterSettings> = new Map(); // TODO create methods to set filter options (for collector shape id) on collision these can the be evaluated by the plugin and sent to the appropriate shape on the canvas)

  public setCollectorFilter(
    shapeId: TLShapeId,
    filterSettings: FilterSettings
  ): void {
    this.filterMap.set(shapeId, filterSettings);
  }

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
    // ! connecting collectors might not be necessary (only grouping)
    // Check if colliding shape is a collector and only connect if it is
    const plugin = unwrapShape(colliding.shape)?.plugin;
    if (plugin?.id === this.id) {
      this.connectShape(self.shape.id, colliding.shape.id, editor);
      editor.groupShapes([self.shape.id, colliding.shape.id]);
    }

    if (plugin?.id !== "file") return;

    const { name, extension } = colliding.data?.attachments?.[0] ?? {};

    const filterSettings = this.filterMap.get(self.shape.id);

    if (!filterSettings) return;

    if (
      filterSettings.filterType === "filetype" &&
      filterSettings.filterValue.toLowerCase() === extension
    ) {
      console.log("Filter detected filetype match");
    }
    if (
      filterSettings.filterType === "name" &&
      name &&
      filterSettings.filterValue &&
      new RegExp(filterSettings.filterValue).test(name)
    ) {
      console.log("Filter detected name match");
    }

    if (filterSettings.filterType === "all") {
      console.log("Filter detected all match");
    }

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
  ): void {}
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(shapeId: string, data?: PluginData): void {}
}

export default new Plugin({
  id: "collector",
  availableShapes: ["rect"],
  useableAsTool: true,
});
