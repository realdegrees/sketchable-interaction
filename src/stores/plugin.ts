import BasePlugin, { PluginData, PluginProps } from "@/plugins/base";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { ComponentType } from "react";
import { TLShape } from "tldraw";
import { create } from "zustand";

export type PluginComponent = ComponentType<{shape: TLShape, data?: PluginData}>;
export interface PluginStore {
  properties: PluginProps;
  plugin: BasePlugin;
  component?: PluginComponent;
  icon?: StaticImport;
}
export interface PluginStoreData {
  selected?: string;
  plugins: PluginStore[];
  getPlugin: (pluginId?: string) => PluginStore | undefined;
  setSelected: (pluginId: string) => void;
  register: (plugin: PluginStore) => void;
}

// TODO adjust plugin store to not only store the id of the currently selected plugin but also a reference to all plugin instances
export const usePluginStore = create<PluginStoreData>((set, get) => ({
  plugins: [],
  getPlugin: (pluginId) =>
    get().plugins.find(({ properties: { id } }) => id === pluginId),
  setSelected: (pluginId) =>
    set((state) => ({
      ...state,
      selected: state.plugins.find(({ properties: { id } }) => id === pluginId)
        ?.properties.id,
    })),
  register: (plugin) =>
    set((state) => ({
      ...state,
      selected: state.selected ?? plugin.properties.id, // Set the first registered plugin as default
      plugins: [...state.plugins, plugin],
    })),
}));
