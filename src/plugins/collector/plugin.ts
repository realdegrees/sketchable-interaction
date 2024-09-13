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
        return;
      }

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

    const hasChildren = this.connectedShapes.get(self.shape.id)?.length;

    if (colliding.plugin?.id !== "file" || !hasChildren) return;

    const fileData = colliding.plugin.properties.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;

    const filterSettings = self.data;

    if (!fileData) return;

    const match =
      !filterSettings || this.doesFilterMatch(filterSettings, fileData);

    if (!match) return;

    const connectedFilters = this.connectedShapes.get(self.shape.id) ?? [];
    const destination = (
      await Promise.all<{ shape?: TLShape; matchScore: number }>(
        // gets the filter results for every connected collector
        connectedFilters.map(async (childIld) => {
          const shape = editor.getShape(childIld);
          const { data: settings, plugin } =
            unwrapShape<CollectorData, CollectorPlugin>(shape) ?? {};
          let matchScore: number = -1;

          if (!settings || !plugin) {
            matchScore = 0;
          } else {
            matchScore = await plugin.doesFilterMatch(settings, fileData);
          }

          return { shape, matchScore };
        })
      )
    )
      // removes results where no match was found
      .filter(
        (
          info
        ): info is {
          shape?: TLShape;
          matchScore: number;
        } => {
          return info?.matchScore >= 0;
        }
      )
      // Finds the item with the highest matchScore
      .reduce<{ shape?: TLShape; matchScore: number } | undefined>(
        (bestMatch, currentMatch) => {
          return !bestMatch || currentMatch.matchScore > bestMatch.matchScore
            ? currentMatch
            : bestMatch;
        },
        undefined
      ) ?? { shape: self.shape }; // Use own shape if no destination is found (in case of connected conveyors)

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

    // Default position to center of shape
    let coords: VecModel = destination.shape
      ? {
          x:
            destination.shape.x +
            ("w" in destination.shape.props
              ? destination.shape.props.w / 2
              : 0),
          y:
            destination.shape.y +
            ("h" in destination.shape.props
              ? destination.shape.props.h / 2
              : 0),
        }
      : { x: 0, y: 0 };

    // Check connected conveyor and if exists set coords to start of conveyor
    const connectedConveyor =
      destination.shape && getConnectedConveyors(destination.shape)?.[0];
    const arrowInfo =
      connectedConveyor && getArrowCoordinates(connectedConveyor, editor);
    coords = arrowInfo
      ? Vec.Add(arrowInfo.origin, arrowInfo.coords[0])
      : coords;

    // Calculate offset so file shape can be centered
    let offset: VecModel = { x: 0, y: 0 };
    if ("h" in colliding.shape.props && "w" in colliding.shape.props) {
      offset.x = -colliding.shape.props.w / 2;
      offset.y = -colliding.shape.props.h / 2;
    }

    // Update shape
    editor.updateShape({
      ...colliding.shape,
      x: coords.x + offset.x,
      y: coords.y + offset.y,
    });
    return;
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
  ): Promise<number> {
    const { name, extension } = attachment;
    const bytes = (await getFile(attachment)?.getFile())?.size;
    const fileSize = bytes && Math.round((bytes / 1048576) * 100) / 100;
    const mimeType = extension && getMimeType(extension);

    if (!name || !extension || !mimeType || !fileSize) return -1;

    // Add one score for each matching filter
    let filterScore: number = -1;
    for (const [key, value] of Object.entries(filterSettings)) {
      if (!value) {
        continue;
      }
      switch (key as keyof CollectorData) {
        case "Name": {
          new RegExp(value, "i").test(name) && filterScore++;
          break;
        }
        case "Mediatype": {
          new RegExp(value, "i").test(mimeType) && filterScore++;
          break;
        }
        case "Extension(s)": {
          value.split(",").some((filter) => filter === extension) &&
            filterScore++;
          break;
        }
        case "Size Max (MB)": {
          const size = Number.parseInt(value);

          if (isNaN(size)) {
            break;
          }
          size <= fileSize && filterScore++;
          break;
        }
        case "Size Min (MB)": {
          const size = Number.parseInt(value);

          if (isNaN(size)) {
            break;
          }
          size >= fileSize && filterScore++;
          break;
        }
        default: {
          console.warn(`${key} filter not implemented!`);
          break;
        }
      }
    }

    return filterScore;
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
