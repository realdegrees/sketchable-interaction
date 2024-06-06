import BasePlugin from "@/plugins/base";
import { create } from "zustand";
export interface PluginData {
  selected?: BasePlugin;
  plugins: BasePlugin[];
  setSelected: (pluginId: string) => void;
  register: (plugin: BasePlugin) => void;
}

// TODO adjust plugin store to not only store the id of the currently selected plugin but also a reference to all plugin instances
export const usePluginStore = create<PluginData>((set) => ({
  setSelected: (pluginId) =>
    set((state) => ({
      ...state,
      selected: state.plugins.find(({ id }) => id === pluginId),
    })),
  plugins: [],
  register: (plugin) =>
    set((state) => ({
      ...state,
      plugins: [...state.plugins, plugin]
    })),
}));
