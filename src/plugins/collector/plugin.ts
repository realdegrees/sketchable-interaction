import {
  Editor,
  TLArrowShape,
  TLShape,
  TLShapeId,
  Vec,
  VecModel,
} from "tldraw";
import BasePlugin, { PluginAttachment, PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import {
  CollectorConnectionState,
  FilterSettings,
  FilterType,
} from "./component";
import { getArrowCoordinates } from "@/util/collision";
import { getMimeType } from "@/util/getMimeType";
import { getFile } from "@/util/file";

class CollectorPlugin extends BasePlugin {
  private settingsMap: Map<TLShapeId, FilterSettings> = new Map(); // TODO create methods to set filter options (for collector shape id) on collision these can the be evaluated by the plugin and sent to the appropriate shape on the canvas)
  private connectionStateSubscriptionMap: Map<
    TLShapeId,
    (state: CollectorConnectionState) => void
  > = new Map();

  public subscribeConnectionState(
    shapeId: TLShapeId,
    callback: (state: CollectorConnectionState) => void
  ): () => void {
    this.connectionStateSubscriptionMap.set(shapeId, callback);
    return this.unsubscribeConnectionState.bind(this, shapeId);
  }
  public unsubscribeConnectionState(shapeId: TLShapeId) {
    this.connectionStateSubscriptionMap.delete(shapeId);
  }
  public setCollectorSettings(
    shapeId: TLShapeId,
    filterSettings: FilterSettings
  ): void {
    this.settingsMap.set(shapeId, filterSettings);
  }
  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      data?: PluginData;
    }
  ): Promise<void> {
    // Check if colliding shape is a collector and only connect if it is
    const plugin = unwrapShape(colliding.shape)?.plugin;

    if (plugin?.id === this.id) {
      this.connectShape(self.shape.id, colliding.shape.id, editor);

      const stateChangeListener = this.connectionStateSubscriptionMap.get(
        self.shape.id
      );

      if (!stateChangeListener) return;

      stateChangeListener("connected");

      return;
    }

    if (plugin?.id !== "file") return;

    const attachment = colliding.data?.attachments?.[0];
    const filterSettings = this.settingsMap.get(self.shape.id);

    if (!filterSettings || !attachment) return;

    const match = this.doesFilterMatch(filterSettings, attachment);

    if (!match) return;

    const connectedFilterSettingsMap = (
      this.connectedShapes.get(self.shape.id) ?? []
    )
      .map((connectedFilterShapeId) => {
        const connectedFilterShape = editor.getShape(connectedFilterShapeId);
        const { plugin } = unwrapShape(connectedFilterShape) ?? {};
        const settings = this.settingsMap.get(connectedFilterShapeId);
        return [connectedFilterShape, settings];
      })
      .filter((data): data is [TLShape, FilterSettings] => !!data[1]);

    for (const [connectedFilterShape, settings] of connectedFilterSettingsMap) {
      const { plugin } = unwrapShape(connectedFilterShape) ?? {};

      if (!settings || !plugin || !(plugin instanceof CollectorPlugin)) {
        continue;
      }

      const connectedConveyors = editor
        .getArrowsBoundTo(connectedFilterShape.id)
        .map(({ arrowId, handleId }) => {
          if (handleId !== "start") return;
          const shape: TLArrowShape = editor.getShape(arrowId) as TLArrowShape;
          if (shape?.isLocked) return;
          const { plugin } = unwrapShape(shape) ?? {};
          return plugin?.id === "conveyor" ? shape : undefined;
        })
        .filter((shape): shape is TLArrowShape => !!shape);

      const coords: VecModel = {
        x: connectedFilterShape?.x,
        y: connectedFilterShape?.y,
      };
      let offset: VecModel = { x: 0, y: 0 };

      if ("h" in colliding.shape.props && "w" in colliding.shape.props) {
        offset.x = -colliding.shape.props.w / 2;
        offset.y = -colliding.shape.props.h / 2;
      }

      if (connectedConveyors[0]) {
        const arrowInfo = getArrowCoordinates(connectedConveyors[0], editor);
        coords.x = arrowInfo.origin.x + arrowInfo.coords[0].x;
        coords.y = arrowInfo.origin.y + arrowInfo.coords[0].y;
      }

      const filterMatch = await plugin.doesFilterMatch(settings, attachment);
      if (filterMatch) {
        editor.updateShape({
          ...colliding.shape,
          x: coords.x + offset.x,
          y: coords.y + offset.y,
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
    console.log("end");

    const plugin = unwrapShape(colliding.shape)?.plugin;
    if (plugin?.id === this.id) {
      this.disconnectShape(self.shape.id, colliding.shape.id, editor);

      const hasConnected = !!this.connectedShapes.get(self.shape.id)?.length;

      const stateChangeListener = this.connectionStateSubscriptionMap.get(
        self.shape.id
      );
      if (!stateChangeListener) return;
      stateChangeListener(hasConnected ? "connected" : "none");
    }
  }
  private async doesFilterMatch(
    filterSettings: FilterSettings,
    attachment: PluginAttachment
  ): Promise<boolean> {
    const { name, extension } = attachment;
    const bytes = (await getFile(attachment)?.getFile())?.size;
    const fileSize = bytes && Math.round((bytes / 1048576) * 100) / 100;
    const mimeType = extension && getMimeType(extension);

    if (!name || !extension || !mimeType || !fileSize) return false;

    const filterResults: boolean[] = [];
    for (const [key, value] of Object.entries(filterSettings)) {
      if (!value) {
        filterResults.push(true);
        continue;
      }
      switch (key as keyof FilterSettings) {
        case "Name": {
          filterResults.push(new RegExp(value, "i").test(name));
          break;
        }
        case "Mediatype": {
          filterResults.push(
            !!mimeType && new RegExp(value, "i").test(mimeType)
          );
          break;
        }
        case "Extension(s)": {
          filterResults.push(
            value.split(",").some((filter) => filter === extension)
          );
          break;
        }
        case "Size Max (MB)": {
          const size = Number.parseInt(value);

          if (isNaN(size)) {
            filterResults.push(true);
            break;
          }
          filterResults.push(size <= fileSize);
          break;
        }
        case "Size Min (MB)": {
          const size = Number.parseInt(value);

          if (isNaN(size)) {
            filterResults.push(true);
            break;
          }
          filterResults.push(size >= fileSize);
          break;
        }
        default: {
          console.warn(`${key} filter not implemented!`);
          filterResults.push(true);
          break;
        }
      }
    }

    return filterResults.every(() => true);
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: PluginData): void {
    this.settingsMap.delete(shapeId);
  }
}

export default new CollectorPlugin({
  id: "collector",
  availableShapes: ["rect"],
  useableAsTool: true,
});
