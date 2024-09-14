import BasePlugin from "@/plugins/base";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { listeners } from "process";
import { ComponentType } from "react";
import { JsonObject, TLShape } from "tldraw";
import { create } from "zustand";

export type PluginComponent<T = JsonObject> = ComponentType<{
  shape: TLShape;
  plugin: BasePlugin<T>
  data?: T;
}>;
export interface PluginStore<PluginType = BasePlugin> {
  plugin: PluginType;
  Component?: PluginComponent;
  icon?: StaticImport;
}
export interface PluginStoreData {
  selected?: string;
  plugins: PluginStore[];
  getPlugin: (pluginId?: string) => PluginStore | undefined;
  setSelected: (pluginId: string) => void;
  register: (plugin: PluginStore) => void;
  listeners: Set<(plugin: BasePlugin) => void>;
  onPluginAdded: (callback: (plugin: BasePlugin) => void) => void;
}

// TODO adjust plugin store to not only store the id of the currently selected plugin but also a reference to all plugin instances
export const usePluginStore = create<PluginStoreData>((set, get) => ({
  plugins: [],
  listeners: new Set<(plugin: BasePlugin) => void>(),
  onPluginAdded: (callback: (plugin: BasePlugin) => void) =>
    set((state) => {
      return {
        ...state,
        listeners: state.listeners.add(callback),
      };
    }),
  getPlugin: (pluginId) =>
    get().plugins.find(
      ({
        plugin: {
          properties: { id },
        },
      }) => id === pluginId
    ),
  setSelected: (pluginId) =>
    set((state) => ({
      ...state,
      selected: state.plugins.find(
        ({
          plugin: {
            properties: { id },
          },
        }) => id === pluginId
      )?.plugin.properties.id,
    })),
  register: (pluginStore) =>
    set((state) => {
      state.listeners.forEach((listener) => listener(pluginStore.plugin));
      return {
        ...state,
        selected: state.selected ?? pluginStore.plugin.properties.id, // Set the first registered plugin as default
        plugins: [...state.plugins, pluginStore],
      };
    }),
}));
