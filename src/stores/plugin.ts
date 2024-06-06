import BasePlugin from "@/plugins/base";
import { getDefineEnvPlugin } from "next/dist/build/webpack/plugins/define-env-plugin";
import { create } from "zustand";
export interface PluginData {
  selected?: BasePlugin;
  plugins: BasePlugin[];
  getPlugin: (pluginId: string) => BasePlugin | undefined;
  setSelected: (pluginId: string) => void;
  register: (plugin: BasePlugin) => void;
}

// TODO adjust plugin store to not only store the id of the currently selected plugin but also a reference to all plugin instances
export const usePluginStore = create<PluginData>((set, get) => ({
  plugins: [],
  getPlugin: (pluginId) => get().plugins.find(({ id }) => id === pluginId),
  setSelected: (pluginId) =>
    set((state) => ({
      ...state,
      selected: state.plugins.find(({ id }) => id === pluginId),
    })),
  register: (plugin) =>
    set((state) => ({
      ...state,
      plugins: [...state.plugins, plugin],
    })),
}));
