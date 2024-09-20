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
import { PluginUtil } from "@/util/pluginUtil";
import { CollectorConnectionState } from "./component";
import { getArrowCoordinates } from "@/util/collision";
import { getMimeType } from "@/util/getMimeType";
import { CollectorData } from "./config";
import { FileData } from "../file/config";
import FolderPlugin from "../folder/plugin";
import { usePluginStore } from "@/stores/plugin";

export default class CollectorPlugin extends BasePlugin<CollectorData> {
  private settingsMap: Map<TLShapeId, CollectorData> = new Map(); // TODO create methods to set filter options (for collector shape id) on collision these can the be evaluated by the plugin and sent to the appropriate shape on the canvas)
  private connectionStateSubscription: {
    callback?: (state: CollectorConnectionState) => void;
    lastState: CollectorConnectionState;
  } = {
    lastState: "none",
  };

  public subscribeConnectionState(
    callback: (state: CollectorConnectionState) => void
  ): () => void {
    this.connectionStateSubscription.callback = callback;

    this.connectionStateSubscription.lastState &&
      callback(this.connectionStateSubscription.lastState);
    return this.unsubscribeConnectionState.bind(this);
  }
  public unsubscribeConnectionState() {
    this.connectionStateSubscription.callback = undefined;
  }

  private getState(): CollectorConnectionState {
    let parent: TLShapeId | undefined = PluginUtil.getShapesConnectedTo(
      this.shape
    )[0];
    const children = Array.from(this.connectedShapes);

    if (parent && !children.length) {
      return "output";
    } else if (!parent && children.length) {
      return "input";
    } else if (parent && children.length) {
      return "both";
    } else {
      return "none";
    }
  }
  public async onCollisionStart(
    data: CollectorData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    // Check if colliding shape is a collector and only connect if it is
    if (colliding.plugin?.id === this.id) {
      const isSelected = !!this.editor
        ?.getSelectedShapeIds()
        .includes(this.shape.id);
      const pluginInstances = usePluginStore.getState().instances.get(this.id);
      const collidingParent =
        pluginInstances &&
        Object.entries(pluginInstances).filter(([shapeId, plugin]) =>
          plugin.connectedShapes.has(colliding.shape.id)
        )?.[0]?.[0];
      const collidingChildren = Array.from(colliding.plugin.connectedShapes);
      if (
        this.connectionStateSubscription.lastState === "none" &&
        !isSelected
      ) {
        this.connectShape(colliding.shape.id);
      }
      if (
        this.connectionStateSubscription.lastState === "input" &&
        !collidingParent
      ) {
        this.connectShape(colliding.shape.id);
      }
      if (
        (this.connectionStateSubscription.lastState === "output" ||
          this.connectionStateSubscription.lastState === "both") &&
        !collidingParent &&
        !collidingChildren.length
      ) {
        this.connectShape(colliding.shape.id);
      }

      this.connectionStateSubscription.lastState = this.getState();

      // Inform subscribed component about state
      this.connectionStateSubscription.callback?.(
        this.connectionStateSubscription.lastState
      );

      return;
    }

    if (colliding.plugin?.id !== "file") return;

    const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;

    const filterSettings = data;

    if (!fileData) return;

    const match =
      !filterSettings || this.doesFilterMatch(filterSettings, fileData);

    if (!match) return;

    const connectedFilters = Array.from(this.connectedShapes);
    const collectorScoreMap = await Promise.all<
      | {
          shape: TLShape;
          matchScore: number;
        }
      | undefined
    >(
      // gets the filter results for every connected collector
      connectedFilters.map(async (childIld) => {
        const shape = this.editor!.getShape(childIld);
        if (!shape) return;
        const { data: childFilterSettings, plugin } =
          PluginUtil.unwrapShape<CollectorData, CollectorPlugin>(shape) ?? {};
        let matchScore: number = -1;

        if (!childFilterSettings || !plugin) {
          matchScore = 0;
        } else {
          matchScore = await plugin.doesFilterMatch(
            childFilterSettings,
            fileData
          );
        }

        return { shape, matchScore };
      })
    );

    const bestMatch = collectorScoreMap.reduce<
      { shape: TLShape; matchScore: number } | undefined
    >((bestMatch, currentMatch) => {
      if (
        currentMatch &&
        currentMatch.matchScore >= 0 &&
        (!bestMatch || currentMatch.matchScore > bestMatch.matchScore)
      ) {
        return currentMatch;
      }
      return bestMatch;
    }, undefined);

    const destination =
      bestMatch && bestMatch.matchScore >= 0 ? bestMatch?.shape : this.shape;

    // Utility function
    const getConnectedConveyors = (shape: TLShape) => {
      return this.editor!.getArrowsBoundTo(shape.id)
        .map(({ arrowId, handleId }) => {
          if (handleId !== "start") return;
          const shape: TLArrowShape = this.editor!.getShape(
            arrowId
          ) as TLArrowShape;
          if (shape?.isLocked) return;
          const { plugin } = PluginUtil.unwrapShape(shape) ?? {};
          return plugin?.id === "conveyor" ? shape : undefined;
        })
        .filter((shape): shape is TLArrowShape => !!shape);
    };

    // Default position to center of shape
    let coords: VecModel = destination
      ? {
          x:
            destination.x +
            ("w" in destination.props ? destination.props.w / 2 : 0),
          y:
            destination.y +
            ("h" in destination.props ? destination.props.h / 2 : 0),
        }
      : { x: 0, y: 0 };

    // Check connected conveyor and if exists set coords to start of conveyor
    const connectedConveyor =
      destination && getConnectedConveyors(destination)?.[0];
    const arrowInfo =
      connectedConveyor && getArrowCoordinates(connectedConveyor, this.editor!);
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
    this.editor?.updateShape({
      ...colliding.shape,
      x: coords.x + offset.x,
      y: coords.y + offset.y,
    });
    return;
  }
  public async onCollisionEnd(
    data: CollectorData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    const plugin = PluginUtil.unwrapShape(colliding.shape)?.plugin;
    if (plugin?.id === this.id) {
      this.disconnectShape(colliding.shape.id);
      colliding.plugin.disconnectShape(this.shape.id);
      // Calculate state and cache it
      this.connectionStateSubscription.lastState = this.getState();

      // Inform subscribed component about state
      this.connectionStateSubscription.callback?.(
        this.connectionStateSubscription.lastState
      );
    }
  }
  private async doesFilterMatch(
    filterSettings: CollectorData,
    attachment: PluginAttachment
  ): Promise<number> {
    const { name, extension } = attachment;
    const folderPlugin = PluginUtil.getPlugin<FolderPlugin>(
      attachment.sourceShape
    );
    const originalFileHandle = folderPlugin?.handles?.files.find(
      ({ name: fname }) => fname === `${name}.${extension}`
    );
    const file = await originalFileHandle?.getFile();
    const bytes = file?.size;
    const fileSize = bytes && Math.round((bytes / 1048576) * 100) / 100;
    const mimeType = extension && getMimeType(extension);

    if (!name || !extension || !mimeType || !fileSize) return -1;

    // Add one score for each matching filter
    let filterScore: number = -1;
    for (const [key, value] of Object.entries(filterSettings)) {
      if (!value) {
        continue;
      }
      let condition: boolean;
      switch (key as keyof CollectorData) {
        case "Name": {
          condition = new RegExp(value, "i").test(name);
          break;
        }
        case "Mediatype": {
          condition = new RegExp(value, "i").test(mimeType);
          break;
        }
        case "Extension(s)": {
          condition = value.split(",").some((filter) => filter === extension);
          break;
        }
        case "Size Max (MB)": {
          const maxSize = Number.parseInt(value);
          if (isNaN(maxSize)) {
            continue; // skip filter assignment
          }
          condition = maxSize >= fileSize;
          break;
        }
        case "Size Min (MB)": {
          const minSize = Number.parseInt(value);
          if (isNaN(minSize)) {
            continue; // skip filter assignment
          }
          condition = minSize <= fileSize;
          break;
        }
        default: {
          console.warn(`${key} filter not implemented!`);
          continue; // skip filter assignment
        }
      }
      filterScore += condition ? 1 : -Infinity; // adds score
    }
    return filterScore;
  }
  public onCreate(editor: Editor, shape: TLShape): void {}
  public override onDelete(): void {
    this.settingsMap.delete(this.shape.id);
    // const children = this.connectedShapes.get(shapeId) ?? [];
    // const parent = Array.from(this.connectedShapes.entries()).find(
    //   ([, children]) => children.includes(shapeId)
    // )?.[0];

    super.onDelete();

    // for (const relative of [...children, parent]) {
    //   if (!relative) continue;
    //   this.connectionStateSubscription
    //     .get(relative)
    //     ?.callback?.(this.getConnectionState(relative));
    // }
  }
}
