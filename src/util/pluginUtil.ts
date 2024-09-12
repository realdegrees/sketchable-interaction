import BasePlugin, { PluginPropsSchema, SerializablePluginProps, SerializablePluginPropsSchema } from "@/plugins/base";
import { PluginStore, usePluginStore } from "@/stores/plugin";
import { Data } from "detect-collisions";
import { JsonObject, TLShape } from "tldraw";
import { z } from "zod";

export type MetaPayload<T = JsonObject> = {
  [pluginId: string]: T | SerializablePluginProps;
};

export const unwrapShape = <PluginData = JsonObject, PluginType = BasePlugin>(
  shape?: Partial<TLShape> & { meta: JsonObject }
): (PluginStore<PluginType> & { data?: PluginData }) | undefined => {
  if (!shape) return undefined;

  const { getPlugin } = usePluginStore.getState();

  const props: SerializablePluginProps | undefined =
    SerializablePluginPropsSchema.safeParse(shape?.meta["props"]).data;

  const { plugin, Component, icon } = getPlugin(props?.id) ?? {};
  if (!plugin || !props) {
    // console.error(
    //   `Unable to find attached plugin\nShape: ${shape?.id}`
    // );
    return;
  }

  const pluginDataSchema = plugin.properties.pluginDataSchema;
  const data = pluginDataSchema.safeParse(shape.meta[props.id]).data as PluginData;

  return {
    plugin: plugin as PluginType,
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
