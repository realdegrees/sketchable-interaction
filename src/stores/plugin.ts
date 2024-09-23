import BasePlugin, { PluginConfig } from "../../plugins/base";
import { PluginConstructor } from "@/util/pluginUtil";
import EventEmitter from "events";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { listeners } from "process";
import { ComponentType } from "react";
import { JsonObject, Store, TLShape, TLShapeId } from "tldraw";
import { create } from "zustand";

type PluginID = string;
export type PluginComponent<
  PluginData = JsonObject,
  PluginType = BasePlugin<PluginData>
> = ComponentType<{
  shape: TLShape;
  plugin?: PluginType;
  data?: PluginData;
}>;
export interface PluginStore<PluginType = BasePlugin> {
  plugin?: PluginType;
  config: PluginConfig;
  Component?: PluginComponent;
  icon?: StaticImport;
}
export interface PluginStoreData {
  selected?: PluginID;
  plugins: (PluginStore & {
    pluginConstructor: PluginConstructor;
  })[];
  instances: Map<PluginID, { [id: TLShapeId]: BasePlugin }>;
  getPlugin: (
    shapeId: TLShapeId
  ) => (PluginStore & { pluginConstructor: PluginConstructor }) | undefined;
  getPlugins: (
    pluginId: PluginID
  ) => (PluginStore & { pluginConstructor: PluginConstructor })[] | undefined;
  getPluginConfig: <T extends { [K in keyof PluginConfig]?: null }>(
    pluginId: PluginID,
    exclude?: T
  ) => Omit<PluginConfig, keyof T> | undefined;
  setSelected: (pluginId: PluginID) => void;
  isRegistered: (shapeId: TLShapeId) => boolean;
  getConstructor: (pluginId: PluginID) => PluginConstructor | undefined;
  register: (
    plugin:
      | (PluginStore & {
          pluginConstructor: PluginConstructor;
        })
      | string,
    total: number
  ) => void;
  eventEmitter: EventEmitter;
  failedToLoad: string[];
  registerInstance: (shapeId: TLShapeId, instance: BasePlugin) => void;
  unregisterInstance: (shapeId: TLShapeId) => void;
  listeners: Set<(plugin: BasePlugin) => void>;
}

export const usePluginStore = create<PluginStoreData>((set, get) => ({
  plugins: [],
  totalPlugins: undefined,
  failedToLoad: [],
  instances: new Map(),
  eventEmitter: new EventEmitter(),
  ready: new Promise<void>((res) => {}),
  listeners: new Set<(plugin: BasePlugin) => void>(),

  isRegistered: (shapeId) => {
    const { instances } = get();
    return !!Array.from(instances.entries()).find(
      ([, shapePluginMap]) => shapePluginMap[shapeId]
    );
  },
  getConstructor: (pluginId) => {
    const { plugins } = get();
    return plugins.find(({ config: { id } }) => id === pluginId)
      ?.pluginConstructor;
  },
  getPlugin: (shapeId) => {
    const { instances, plugins } = get();
    const [pluginId, shapePluginMap] =
      Array.from(instances.entries()).find(
        ([, shapePluginMap]) => shapePluginMap[shapeId]
      ) ?? [];
    const plugin = shapePluginMap?.[shapeId];
    const store = plugins.find(({ config }) => config.id === pluginId);

    return (
      store && {
        ...store,
        plugin,
        config: plugin?.config ?? store.config,
      }
    );
  },
  getPlugins: (pluginId) => {
    const { instances, plugins } = get();
    const instanceShapeMap = instances.get(pluginId);
    const pluginInstances = instanceShapeMap && Object.values(instanceShapeMap);
    const store = plugins.find(({ config }) => config.id === pluginId);

    return pluginInstances
      ?.filter((instance) => !!instance)
      ?.map(
        (instance) =>
          store && {
            ...store,
            plugin: instance,
          }
      ) as
      | (PluginStore & { pluginConstructor: PluginConstructor })[]
      | undefined;
  },
  getPluginConfig: (pluginId) => {
    const { plugins } = get();
    const store = plugins.find(({ config }) => config.id === pluginId);
    return store?.config;
  },
  setSelected: (pluginId) =>
    set((state) => ({
      ...state,
      selected: state.plugins.find(({ config: { id } }) => id === pluginId)
        ?.config.id,
    })),
  registerInstance: (shapeId: TLShapeId, instance: BasePlugin) =>
    set((state) => {
      const prev = state.instances.get(instance.id);
      const instances = new Map(state.instances.entries()).set(instance.id, {
        ...prev,
        [shapeId]: instance,
      });
      return {
        ...state,
        instances,
      };
    }),
  unregisterInstance: (shapeId: TLShapeId) =>
    set((state) => {
      state.instances.delete(shapeId);
      return state;
    }),
  register: (pluginStore, total) => {
    if (typeof pluginStore === "string") {
      set((state) => ({
        ...state,
        failedToLoad: [...state.failedToLoad, pluginStore],
      }));
    } else {
      set((state) => ({
        ...state,
        selected: state.selected ?? pluginStore.config.id, // Set the first registered plugin as default
        plugins: [...state.plugins, pluginStore],
      }));
    }
    // If all plugins are loaded then emite the ready event
    const { plugins, eventEmitter, failedToLoad } = usePluginStore.getState();
    const totalLoadedPlugins = plugins.length + failedToLoad.length;
    if (totalLoadedPlugins === total) {
      if (!!failedToLoad.length) {
      }
      eventEmitter.emit("ready");
    }
  },
}));
