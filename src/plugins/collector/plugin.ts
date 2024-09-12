import {
  Editor,
  JsonObject,
  TLArrowShape,
  TLShape,
  TLShapeId,
  Vec,
  VecModel,
} from "tldraw";
import BasePlugin, { PluginAttachment } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import { CollectorConnectionState } from "./component";
import { getArrowCoordinates } from "@/util/collision";
import { getMimeType } from "@/util/getMimeType";
import { getFile } from "@/util/file";
import { z } from "zod";
import { FileData } from "../file/plugin";

const CollectorDataSchema = z.object({
  Name: z.string(),
  Mediatype: z.string(),
  "Extension(s)": z.string(),
  "Size Max (MB)": z.string(),
  "Size Min (MB)": z.string(),
});
export type CollectorData = z.infer<typeof CollectorDataSchema>;

class CollectorPlugin extends BasePlugin<CollectorData> {
  private settingsMap: Map<TLShapeId, CollectorData> = new Map(); // TODO create methods to set filter options (for collector shape id) on collision these can the be evaluated by the plugin and sent to the appropriate shape on the canvas)
  private connectionStateSubscriptionMap: Map<
    TLShapeId,
    {
      callback?: (state: CollectorConnectionState) => void;
      lastState?: CollectorConnectionState;
    }
  > = new Map();

  public subscribeConnectionState(
    shapeId: TLShapeId,
    callback: (state: CollectorConnectionState) => void
  ): () => void {
    const lastState =
      this.connectionStateSubscriptionMap.get(shapeId)?.lastState;

    this.connectionStateSubscriptionMap.set(shapeId, {
      callback,
      lastState,
    });

    lastState && callback(lastState);
    return this.unsubscribeConnectionState.bind(this, shapeId);
  }
  public unsubscribeConnectionState(shapeId: TLShapeId) {
    this.connectionStateSubscriptionMap.delete(shapeId);
  }

  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: CollectorData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    // Check if colliding shape is a collector and only connect if it is
    if (colliding.plugin?.id === this.id) {
      let connectionSubscription = this.connectionStateSubscriptionMap.get(
        self.shape.id
      );
      if (!connectionSubscription) {
        connectionSubscription = this.connectionStateSubscriptionMap
          .set(self.shape.id, {})
          .get(self.shape.id);
      }
      if (!connectionSubscription) return;

      connectionSubscription.lastState = this.processConnectionState(
        self.shape,
        colliding.shape,
        editor
      );

      const stateChangeListener = connectionSubscription.callback;
      if (!stateChangeListener) return;
      stateChangeListener(connectionSubscription.lastState);

      return;
    }

    if (colliding.plugin?.id !== "file") return;

    const fileData = colliding.plugin.properties.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;

    const filterSettings = self.data;

    if (!fileData) return;

    const match =
      !filterSettings || this.doesFilterMatch(filterSettings, fileData);

    if (!match) return;

    const connectedFilterSettingsMap = (
      await Promise.all(
        (this.connectedShapes.get(self.shape.id) ?? []).map(async (childIld) => {
          const child = editor.getShape(childIld);
          const { data: settings, plugin } =
            unwrapShape<CollectorData, CollectorPlugin>(child) ?? {};

          const isMatch =
            !!settings && (await plugin?.doesFilterMatch(settings, fileData));
          return { child, isMatch };
        })
      )
    ).filter(
      (
        info
      ): info is {
        child: TLShape;
        isMatch: boolean;
      } => {
        const { isMatch } = info;
        return !!isMatch;
      }
    );

    const getConnectedConveyors = (shape: TLShape) => {
      return editor
        .getArrowsBoundTo(shape.id)
        .map(({ arrowId, handleId }) => {
          if (handleId !== "start") return;
          const shape: TLArrowShape = editor.getShape(arrowId) as TLArrowShape;
          if (shape?.isLocked) return;
          const { plugin } = unwrapShape(shape) ?? {};
          return plugin?.id === "conveyor" ? shape : undefined;
        })
        .filter((shape): shape is TLArrowShape => !!shape);
    };

    // If no matching connected collectors were found then attempt to transport colliding item to a conveyor belt
    if (!connectedFilterSettingsMap.length) {
      const connectedConveyors = getConnectedConveyors(self.shape);

      if (!connectedConveyors[0]) return;

      const arrowInfo = getArrowCoordinates(connectedConveyors[0], editor);
      const coords = Vec.Add(arrowInfo.origin, arrowInfo.coords[0]);

      let offset: VecModel = { x: 0, y: 0 };

      if ("h" in colliding.shape.props && "w" in colliding.shape.props) {
        offset.x = -colliding.shape.props.w / 2;
        offset.y = -colliding.shape.props.h / 2;
      }

      editor.updateShape({
        ...colliding.shape,
        x: coords.x + offset.x,
        y: coords.y + offset.y,
      });
      return;
    }

    for (const {
      child,
      isMatch,
    } of connectedFilterSettingsMap) {
      const connectedConveyors = getConnectedConveyors(child);

      const coords: VecModel = {
        x: child?.x,
        y: child?.y,
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

      if (isMatch) {
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
  public async onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: CollectorData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const plugin = unwrapShape(colliding.shape)?.plugin;
    if (plugin?.id === this.id) {
      this.disconnectShape(self.shape.id, colliding.shape.id, editor);
      this.disconnectShape(colliding.shape.id, self.shape.id, editor);

      const incomingConnection = Array.from(
        this.connectedShapes.entries()
      ).find(([, shapes]) => shapes.includes(self.shape.id))?.[0];

      let connectionSubscription = this.connectionStateSubscriptionMap.get(
        self.shape.id
      );

      const children = this.connectedShapes.get(self.shape.id);

      if (!connectionSubscription) {
        connectionSubscription = this.connectionStateSubscriptionMap
          .set(self.shape.id, {})
          .get(self.shape.id);
      }
      if (!connectionSubscription) return;

      connectionSubscription.lastState = this.getConnectionState(self.shape.id);

      const stateChangeListener = connectionSubscription.callback;

      if (!stateChangeListener) return;
      stateChangeListener(connectionSubscription.lastState);
    }
  }
  private getConnectionState(shapeId: TLShapeId): CollectorConnectionState {
    const incomingConnection = Array.from(this.connectedShapes.entries()).find(
      ([, shapes]) => shapes.includes(shapeId)
    )?.[0];

    const children = this.connectedShapes.get(shapeId);

    if (incomingConnection && children?.length) {
      return "both";
    } else if (incomingConnection && !children?.length) {
      return "output";
    } else if (!incomingConnection && children?.length) {
      return "input";
    } else {
      return "none";
    }
  }
  private processConnectionState(
    shapeA: TLShape,
    shapeB: TLShape,
    editor: Editor
  ): CollectorConnectionState {
    let incomingConnection = Array.from(this.connectedShapes.entries()).find(
      ([, shapes]) => shapes.includes(shapeA.id)
    )?.[0];

    const collidingChildren = this.connectedShapes.get(shapeB.id);

    const collidingParent = Array.from(this.connectedShapes.entries()).find(
      ([, shapes]) => shapes.includes(shapeB.id)
    )?.[0];

    if (incomingConnection !== shapeB.id) {
      if (
        collidingChildren?.length ||
        (collidingParent && collidingParent !== shapeA.id)
      ) {
        this.connectShape(shapeB.id, shapeA.id, editor);
        incomingConnection = shapeB.id;
      } else if (collidingChildren?.length || collidingParent) {
        this.connectShape(shapeA.id, shapeB.id, editor);
      } else {
        this.connectShape(shapeB.id, shapeA.id, editor);
        incomingConnection = shapeB.id;
      }
    }

    const children = this.connectedShapes.get(shapeA.id);

    if (incomingConnection && children?.length) {
      return "both";
    } else if (incomingConnection && !children?.length) {
      return "output";
    } else if (!incomingConnection && children?.length) {
      return "input";
    } else {
      return "none";
    }
  }
  private async doesFilterMatch(
    filterSettings: CollectorData,
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
      switch (key as keyof CollectorData) {
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
  public override onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: CollectorData
  ): void {
    this.settingsMap.delete(shapeId);
    const children = this.connectedShapes.get(shapeId) ?? [];
    const parent = Array.from(this.connectedShapes.entries()).find(
      ([, children]) => children.includes(shapeId)
    )?.[0];

    super.onDelete(editor, shapeId, data);

    for (const relative of [...children, parent]) {
      if (!relative) continue;
      this.connectionStateSubscriptionMap
        .get(relative)
        ?.callback?.(this.getConnectionState(relative));
    }
  }
}

export default new CollectorPlugin({
  id: "collector",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: CollectorDataSchema,
});
