import { create } from "zustand";
export interface PluginState {
  selected: string;
  setPlugin: (id: string) => void;
}
export const usePluginStore = create<PluginState>((set) => ({
  selected: "plugin-trash",
  setPlugin: (id) =>
    set((state) => ({
      ...state,
      selected: id,
    })),
}));
