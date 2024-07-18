'use client'

import BasePlugin, { PluginProps } from "@/plugins/base";
import { PluginComponent, usePluginStore } from "@/stores/plugin";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import React, { createElement, lazy, useEffect, useState } from "react";
import "@/util/string.extensions";
import SvgSpinnersBarsFade from '~icons/svg-spinners/bars-fade';
import LoadingIcon from '~icons/line-md/alert-circle-twotone-loop';


const Plugin = ({ name }: { name: string }) => {
    const { setSelected, register } = usePluginStore();
    const [pluginProps, setPluginProps] = useState<PluginProps>();
    const [pluginIcon, setPluginIcon] = useState<StaticImport>();
    const [pluginState, setPluginState] = useState<'loading' | 'error'>('loading');

    useEffect(() => {
        // Loads a plugin and - if loaded correctly - register it with the PluginStore
        Promise.allSettled([
            import(`../plugins/${name}/plugin`), // Load plugin instance
            import(`../plugins/${name}/icon.svg`), // Load plugin icon
            import(`../plugins/${name}/component`), // Load component
        ]).then(async ([pluginResult, iconResult, componentResult]) => {
            let plugin: BasePlugin | undefined
            let icon: StaticImport | undefined;
            let Component: PluginComponent | undefined; // PascalCase due to react component naming conventions

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

            // Load optional icon for plugin
            if (iconResult.status === 'fulfilled') {
                icon = iconResult.value;
            }

            // Load optional component for plugin
            if (componentResult.status === 'fulfilled') {
                const warn = () => console.warn(`Unable to load 'component.tsx' in 'plugins/${name}'.\nNot a valid react component!`);

                // Check if the loaded component is a react component
                // ? checking for function type also covers class components as valid
                if (typeof componentResult.value.default === 'function') {
                    try {
                        createElement(componentResult.value.default); // Check if the loaded component is a valid react component
                        Component = lazy(() => Promise.resolve(componentResult.value)); // Load plugin component
                    } catch (e) {
                        warn();
                    }
                } else {
                    warn();
                }

            }

            // Verbose Error messages were logged above so we just abort here
            if (!plugin) {
                setPluginState('error');
                return;
            }

            // Plugin loading successful -> Register it with the store
            register({
                plugin,
                Component,
                icon
            });

            // Assign states for the plugin-tool component to use
            setPluginProps(plugin.properties);
            setPluginIcon(icon);
        })
    }, [name, register, setPluginProps, setPluginIcon, setPluginState])

    if (!pluginProps) {
        return <div className=" w-10 h-10 m-1 flex flex-col items-center justify-center" title={pluginState === 'error' ? 'Failed to load plugin! Check console for more information.' : ''}>
            {pluginState === 'loading' ?
                <SvgSpinnersBarsFade />
                : <LoadingIcon />}
            <p className="text-center text-xs pointer-events-none">{name.toPascalCase()}</p>
        </div>
    }
    const { id, useableAsTool: selectable } = pluginProps;
    const label = (pluginProps.label ?? id).toPascalCase()

    return selectable ? (
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
    ) : <></>
}
export default Plugin;