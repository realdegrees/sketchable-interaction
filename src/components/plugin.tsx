'use client'

import BasePlugin, { PluginData, PluginProps, PluginPropsSchema } from "@/plugins/base";
import { PluginComponent, usePluginStore } from "@/stores/plugin";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { ComponentType, lazy, useEffect, useState } from "react";
import "@/util/string.extensions";
import SvgSpinnersBarsFade from '~icons/svg-spinners/bars-fade';
import LineMdAlertCircleTwotoneLoop from '~icons/line-md/alert-circle-twotone-loop';

const Plugin = ({ name }: { name: string }) => {
    const { setSelected, register } = usePluginStore();
    const [pluginProps, setPluginProps] = useState<PluginProps>();
    const [pluginIcon, setPluginIcon] = useState<StaticImport>();
    const [pluginState, setPluginState] = useState<'loading' | 'error'>('loading');

    useEffect(() => {
        // Loads a plugin and - if loaded correctly - register it with the PluginStore
        Promise.allSettled([
            import(`../plugins/${name}/plugin`), // Load plugin instance
            import(`../plugins/${name}/properties`), // Load plugin properties
            import(`../plugins/${name}/icon.svg`), // Load plugin icon
            lazy(() => import(`../plugins/${name}/component`)), // Load plugin component
        ]).then(async ([pluginResult, propertiesResult, iconResult, componentResult]) => {
            let plugin: BasePlugin | undefined
            let properties: PluginProps | undefined;
            let icon: StaticImport | undefined;
            let component: PluginComponent | undefined;

            // Checks if the plugin logic was loaded and if it was implemented correctly
            if (pluginResult.status === 'fulfilled') {
                if (pluginResult.value.default instanceof BasePlugin) {
                    plugin = pluginResult.value.default;
                } else {
                    console.warn(`Exported plugin '${name}'/plugin.ts must be an instance of 'BasePlugin'.\nLoading of '${name}' plugin was skipped!`);
                }
            } else {
                console.warn(`Unable to find 'plugin.ts' in 'plugins/${name}'.\nLoading of '${name}' plugin was skipped!`);
            }

            // Checks if properties was loaded correctly and if it fits the schema
            if (propertiesResult.status === 'fulfilled') {
                const propertiesParseResult = PluginPropsSchema.safeParse(propertiesResult.value.default);
                if (!propertiesParseResult.success) {
                    console.warn(`Exported properties for plugin '${name}' are invalid.\nMake sure the properties object validates against 'PluginPropsSchema' in 'plugins/base.ts'.\nLoading of '${name}' plugin was skipped!`);
                } else {
                    properties = propertiesParseResult.data;
                }
            } else {
                console.warn(`Unable to find 'properties.ts' in 'plugins/${name}'.\nLoading of '${name}' plugin was skipped!`);
            }

            // Load optional icon for plugin
            if (iconResult.status === 'fulfilled') {
                icon = iconResult.value;
            }
            // Load optional component for plugin
            if (componentResult.status === 'fulfilled') {
                component = componentResult.value;
            }

            // Verbose Error messages were logged above so we just abort here
            if (!properties || !plugin) {
                setPluginState('error');
                return;
            }

            // Plugin loading successful -> Register it with the store
            register({
                properties,
                plugin,
                component,
                icon
            });

            // Assign states for the plugin-tool component to use
            setPluginProps(properties);
            setPluginIcon(icon);
        })
    }, [name, register, setPluginProps, setPluginIcon, setPluginState])

    if (!pluginProps) {
        return <div className=" w-10 h-10 m-1 flex flex-col items-center justify-center" title={pluginState === 'error' ? 'Failed to load plugin! Check console for more information.' : ''}>
            {pluginState === 'loading' ?
                <SvgSpinnersBarsFade />
                : <LineMdAlertCircleTwotoneLoop />}
            <p className="text-center text-xs pointer-events-none">{name.toPascalCase()}</p>
        </div>
    }
    const { id } = pluginProps;
    const label = (pluginProps.label ?? id).toPascalCase()

    return (
        <div
            id={`plugin-${id}`}
            title={label}
            className={`flex justify-center items-center w-10 h-10 overflow-hidden hover:brightness-125 m-1 rounded-xl bg-zinc-700 border-white
                ${usePluginStore.getState().selected === pluginProps.id ? 'brightness-125 border' : ''}`}
            onClick={() => setSelected(id)}
        >
            {pluginIcon ?
                <Image src={pluginIcon} alt={label ?? id} loading="lazy" />
                : label}
        </div>
    )
}
export default Plugin;