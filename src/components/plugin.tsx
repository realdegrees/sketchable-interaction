'use client'

import BasePlugin, { PluginProps } from "@/plugins/base";
import { usePluginStore } from "@/stores/plugin";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { ComponentType, lazy, useEffect, useState } from "react";

const Plugin = ({ name }: { name: string }) => {
    const { setSelected, register } = usePluginStore();
    const [pluginProps, setPluginProps] = useState<PluginProps>();

    useEffect(() => {
        Promise.all([
            import(`../plugins/${name}/plugin`), // Load the plugin instance
            import(`../plugins/${name}/properties`) // Load plugin properties
        ]).then(async ([{ default: plugin }, { default: properties }]: [{ default: BasePlugin }, { default: PluginProps }]) => {
            // Load plugin component

            let component: ComponentType | undefined;
            let icon: StaticImport | undefined;

            try {
                component = lazy(() => import(`../plugins/${name}/component`));
            }
            catch (e) {
                console.warn(`No component found for plugin '${properties.id}'`);
             }
            try {
                icon = await import(`../plugins/${name}/icon.svg`);
            }
            catch (e) { 
                console.warn(`No icon found for plugin '${properties.id}'`);
            }

            register({
                properties,
                plugin,
                component,
                icon
            });
            setPluginProps(properties);
        })
    }, [name, register, setPluginProps])

    if (!pluginProps) {
        return <p>{`Loading\n${name}`}</p>
    }
    const { id, label } = pluginProps;

    return (
        <div id={`plugin-${id}`} className="flex justify-center items-center w-14 h-14 rounded overflow-hidden hover:brightness-125" onClick={() => {
            console.log(`Setting plugin to ${id}`);

            setSelected(id);
        }}>
            <p className="text-ellipsis absolute bottom-1 max-w-full overflow-hidden pointer-events-none">
                {label ?? id}
            </p>
        </div>
    )
}
export default Plugin;