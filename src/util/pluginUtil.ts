import { ShapeMetaSchema } from "@/components/tlwrap";
import BasePlugin, { PluginData, PluginProps } from "@/plugins/base";
import { PluginComponent, PluginStore, usePluginStore } from "@/stores/plugin";
import { JsonObject, TLShape } from "tldraw";
import { StaticImport } from "next/dist/shared/lib/get-img-props";

export const unwrapShape = (
  shape?: Partial<TLShape> & { meta: JsonObject }
): (PluginStore & { data?: PluginData }) | undefined => {
  if (!shape) return undefined;

  const { getPlugin } = usePluginStore.getState();

  const { data, props } = ShapeMetaSchema.safeParse(shape?.meta).data ?? {};

  const { plugin, Component, icon } = getPlugin(props?.id) ?? {};

  if (!plugin) {
    // console.error(
    //   `Unable to find attached plugin\nShape: ${shape?.id}`
    // );
    return;
  }

  return {
    plugin,
    Component,
    data,
    icon,
  };
};

export const isPluginShape: (
  shape?: Partial<TLShape> & { meta: JsonObject }
) => boolean = (shape) => {
  return !!unwrapShape(shape);
};
