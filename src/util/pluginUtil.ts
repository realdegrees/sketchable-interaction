import { ShapeMeta, ShapeMetaSchema } from "@/components/tlwrap";
import BasePlugin, { PluginData, PluginProps } from "@/plugins/base";
import { usePluginStore } from "@/stores/plugin";
import { ComponentType } from "react";
import { JsonObject, TLShape } from "tldraw";

export const unwrapShape = (
  shape: Partial<TLShape> & { meta: JsonObject }
):
  | {
      plugin: BasePlugin;
      properties: PluginProps;
      component?: ComponentType;
      data?: PluginData;
    }
  | undefined => {
  const { getPlugin } = usePluginStore.getState();
    
  const { data, props } = ShapeMetaSchema.safeParse(shape.meta).data ?? {};

  const { plugin, properties, component } = getPlugin(props?.id) ?? {};

  if (!plugin || !properties) {
    console.error(
      `Unable to find attached plugin\nShape: ${shape.id}\nPlugin: ${properties?.id}`
    );
    return;
  }

  return {
    plugin,
    properties,
    component,
    data,
  };
};
