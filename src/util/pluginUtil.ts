import BasePlugin, { PluginConfig, PluginConfigSchema } from "../../plugins/base";
import { PluginStore, usePluginStore } from "@/stores/plugin";
import { Editor, JsonObject, TLShape, TLShapeId } from "tldraw";

export type MetaPayload<T = JsonObject> =
  | {
      [pluginId: string]: T;
    }
  | {
      config: Omit<PluginConfig, "pluginDataSchema"> & {
        pluginDataSchema: null;
      };
    };

export type PluginConstructor<PluginType = BasePlugin> = new (
  config: PluginConfig,
  shape: TLShape,
  editor?: Editor
) => PluginType;

export type UnwrappedShape<
  PluginData = JsonObject,
  PluginType = BasePlugin<PluginData>
> = PluginStore<PluginType> & {
  data?: PluginData;
} & {
  pluginConstructor?: PluginConstructor<PluginType>;
};

export class PluginUtil {
  private static editor: Editor | undefined;

  public static setEditor(editor: Editor) {
    this.editor = editor;
  }

  public static getPlugin<T = BasePlugin>(shapeId: TLShapeId): T | undefined {
    return usePluginStore.getState().getPlugin(shapeId)?.plugin as T;
  }

  public static getConnectedShapes(shape: TLShape): TLShapeId[] {
    const plugin = this.getPlugin(shape.id);
    if (!plugin) return [];
    const { instances } = usePluginStore.getState();
    return Array.from(
      instances.get(plugin.id)?.[shape.id].connectedShapes ?? []
    );
  }
  public static getShapesConnectedTo(
    shape: TLShape,
    options: { samePlugin: boolean } = { samePlugin: true }
  ): TLShapeId[] {
    const { config } = this.unwrapShape(shape) ?? {};
    if (!config) return [];

    const { instances } = usePluginStore.getState();

    const parents: TLShapeId[] = [];

    Array.from(instances.entries()).forEach(([pluginId, connectionMap]) => {
      if (options.samePlugin && pluginId !== config.id) return;
      const parentIds = Object.entries(connectionMap)
        .map(([shapeId, plugin]) => {
          const isParent = plugin.connectedShapes.has(shape.id);
          if (isParent) return shapeId as TLShapeId;
        })
        .filter((id): id is TLShapeId => !!id);
      parents.push(...parentIds);
    });

    return parents;
  }

  /**
   * Unwraps a shape and initializes the plugin if it's not initialized yet
   * @param shape
   * @returns
   */
  public static unwrapShape<PluginData = JsonObject, PluginType = BasePlugin>(
    shape?: Partial<TLShape> & { meta: JsonObject; id: TLShapeId },
    options?: {
      omit?: (keyof UnwrappedShape)[];
    }
  ): UnwrappedShape<PluginData, PluginType> | undefined {
    if (!shape) return;

    const { getPlugin, isRegistered, getConstructor, getPluginConfig } =
      usePluginStore.getState();

    const { id: pluginId } =
      (PluginConfigSchema.omit({
        pluginDataSchema: true,
      }).safeParse(shape.meta["config"]).data as Omit<
        PluginConfig,
        "pluginDataSchema"
      >) ?? {};

    if (!pluginId) return; // Not a plugin shape

    // Shape is not registered in the system yet, attempt tor egister it and continue
    if (!isRegistered(shape.id)) {
      const pluginConstructor = getConstructor(pluginId);
      const pluginDefaultConfig = getPluginConfig(pluginId);

      if (!pluginConstructor) {
        console.warn(
          `Attempted to unwrap shape ${shape.id} with valid config for plugin ${pluginId} but didn't find a matching plugin constructor!`
        );
        return;
      }

      if (!pluginDefaultConfig) {
        console.warn(
          `Attempted to unwrap shape ${shape.id} with valid config for plugin ${pluginId} but didn't find a matching config!`
        );
        return;
      }

      const plugin = new pluginConstructor(
        pluginDefaultConfig as PluginConfig,
        shape as TLShape
      );
      usePluginStore.getState().registerInstance(shape.id, plugin);
    }

    const { Component, config, pluginConstructor, icon, plugin } =
      getPlugin(shape.id) ?? {};

    if (!config || !plugin) {
      console.error(
        `Unwrapping failed at plugin store query!`,
        shape,
        pluginId
      );
      return;
    }

    const pluginDataSchema = config.pluginDataSchema;
    const data = pluginDataSchema.safeParse(shape.meta[plugin.config.id])
      .data as PluginData;

    const unwrappedShape = {
      plugin,
      config,
      pluginConstructor,
      Component,
      data,
      icon,
    } as UnwrappedShape;

    const filteredUnwrappedShape = { ...unwrappedShape } as Record<
      string,
      unknown
    >;
    options?.omit &&
      options?.omit.forEach((key) => delete filteredUnwrappedShape[key]);
    return filteredUnwrappedShape as unknown as UnwrappedShape<PluginData, PluginType>;
  }
}
