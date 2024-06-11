import BasePlugin, { PluginProps } from "@/plugins/base";
import { getDefineEnvPlugin } from "next/dist/build/webpack/plugins/define-env-plugin";
import { ComponentType } from "react";
import { create } from "zustand";

interface PluginStore {
  properties: PluginProps;
  plugin: BasePlugin;
  component?: ComponentType;
}
export interface PluginData {
  selected?: string;
  plugins: PluginStore[];
  getPlugin: (pluginId?: string) => PluginStore | undefined;
  setSelected: (pluginId: string) => void;
  register: (plugin: PluginStore) => void;
}

// TODO adjust plugin store to not only store the id of the currently selected plugin but also a reference to all plugin instances
export const usePluginStore = create<PluginData>((set, get) => ({
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
      plugins: [...state.plugins, plugin],
    })),
}));
