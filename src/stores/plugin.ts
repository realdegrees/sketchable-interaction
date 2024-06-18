import BasePlugin, { PluginProps } from "@/plugins/base";
import { getDefineEnvPlugin } from "next/dist/build/webpack/plugins/define-env-plugin";
import { ComponentType } from "react";
import { create } from "zustand";

interface PluginStore {
  properties: PluginProps;
  plugin: BasePlugin;
  component?: ComponentType;
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
