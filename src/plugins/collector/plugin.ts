import { Editor, TLArrowShape, TLShape, TLShapeId, Vec } from "tldraw";
import BasePlugin, { PluginAttachment, PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import { FilterSettings, FilterType } from "./component";

class CollectorPlugin extends BasePlugin {
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
    // Check if colliding shape is a collector and only connect if it is
    const plugin = unwrapShape(colliding.shape)?.plugin;

    if (plugin?.id === this.id) {
      const isAlreadyConnected = this.connectedShapes
        .get(colliding.shape.id)
        ?.includes(self.shape.id);

      if (!isAlreadyConnected) {
        this.connectShape(self.shape.id, colliding.shape.id, editor);
      }
      return;
    }

    if (plugin?.id !== "file") return;

    const attachment = colliding.data?.attachments?.[0];
    const filterSettings = this.filterMap.get(self.shape.id);

    if (!filterSettings || !attachment) return;

    const match = this.doesFilterMatch(filterSettings, attachment);

    if (!match) return;

    const connectedFilterSettingsMap = (this.connectedShapes.get(self.shape.id) ?? []).map(
      (connectedFilterShapeId) => {

        const connectedFilterShape = editor.getShape(connectedFilterShapeId);
        const { plugin } = unwrapShape(connectedFilterShape) ?? {};
        const settings = this.filterMap.get(connectedFilterShapeId);
        return [connectedFilterShape, settings];
      }
    ).filter((data): data is [TLShape, FilterSettings] => !!data[1]);

    for (const [connectedFilterShape, settings] of connectedFilterSettingsMap) {
      const { plugin } = unwrapShape(connectedFilterShape) ?? {};
      
      if (!settings || !plugin || !(plugin instanceof CollectorPlugin)) {
        continue;
      }

      if (plugin.doesFilterMatch(settings, attachment)) {
        editor.updateShape({
          ...colliding.shape,
          x: connectedFilterShape?.x,
          y: connectedFilterShape?.y,
        });
        break;
      }
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
  ): void {
    const plugin = unwrapShape(colliding.shape)?.plugin;
    if (plugin?.id === this.id) {
      this.disconnectShape(self.shape.id, colliding.shape.id, editor);
    }
  }
  private doesFilterMatch(
    filterSettings: FilterSettings,
    attachment: PluginAttachment
  ): boolean {
    const { name, extension } = attachment;

    const typeMatch =
      filterSettings.filterType === "filetype" &&
      filterSettings.filterValue.toLowerCase() === extension;

    const nameMatch =
      filterSettings.filterType === "name" &&
      name &&
      filterSettings.filterValue &&
      new RegExp(filterSettings.filterValue, 'i').test(name);

    return typeMatch || nameMatch || filterSettings.filterType === "all";
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: PluginData
  ): void {}
}

export default new CollectorPlugin({
  id: "collector",
  availableShapes: ["rect"],
  useableAsTool: true,
});
