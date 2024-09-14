'use client'

import BasePlugin, { PluginConfig, PluginConfigSchema } from "@/plugins/base";
import { PluginComponent, usePluginStore } from "@/stores/plugin";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import React, { createElement, lazy, useEffect, useState } from "react";
import "@/util/string.extensions";
import SvgSpinnersBarsFade from '~icons/svg-spinners/bars-fade';
import LoadingIcon from '~icons/line-md/alert-circle-twotone-loop.jsx';
import { PluginConstructor } from "@/util/pluginUtil";


const Plugin = ({ name, total }: { name: string, total: number }) => {
    const { setSelected, register } = usePluginStore();
    const [config, setConfig] = useState<PluginConfig>();
    const [icon, setIcon] = useState<StaticImport>();
    const [state, setState] = useState<'loading' | 'error'>('loading');

    useEffect(() => {
        // Loads a plugin and - if loaded correctly - register it with the PluginStore
        Promise.allSettled([
            import(`../plugins/${name}/plugin`), // Load plugin instance
            import(`../plugins/${name}/config`), // Load plugin config
            import(`../plugins/${name}/icon.svg`), // Load plugin icon
            import(`../plugins/${name}/component`), // Load component
        ]).then(async ([pluginResult, configResult, iconResult, componentResult]) => {
            let pluginConstructor: PluginConstructor | undefined;
            let config: PluginConfig | undefined;
            let icon: StaticImport | undefined;
            let Component: PluginComponent | undefined; // PascalCase due to react component naming conventions

            // Checks if the plugin logic was loaded and if it was implemented correctly
            if (pluginResult.status === 'fulfilled') {
                if (BasePlugin.isSubclass(pluginResult.value.default)) {
                    pluginConstructor = pluginResult.value.default;
                } else {
                    console.warn(`Exported plugin ${name}/plugin.ts does not extend 'BasePlugin'.\nLoading of '${name}' plugin was skipped!`);
                }
            } else {
                console.warn(`Unable to find 'plugin.ts' in plugins/${name}.\nLoading of '${name}' plugin was skipped!`);
            }
            // Checks if the plugin config was loaded and if it matches the schema
            if (configResult.status === 'fulfilled') {
                config = PluginConfigSchema.safeParse(configResult.value.default).data;
                if (!config) {
                    if (configResult.value.default){
                        console.warn(`Plugin '${name}' is missing config.ts.\nLoading of '${name}' plugin was skipped!`);
                    }else {
                        console.warn(`Plugin config ${name}/config.ts does not match the 'pluginProps' type schema.\nLoading of '${name}' plugin was skipped!`);

                    }
                }
            } else {
                console.warn(`Unable to find 'plugin.ts' in plugins/${name}.\nLoading of '${name}' plugin was skipped!`);
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
            if (!pluginConstructor || !config) {
                setState('error');
                return;
            }

            // Plugin loading successful -> Register it with the store
            register({
                pluginConstructor,
                config,
                Component,
                icon
            }, total);

            // Assign states for the plugin-tool component to use
            setConfig(config);
            setIcon(icon);
        })
    }, [name, register, setConfig, setIcon, setState, total])

    if (!config) {
        return <div className=" w-10 h-10 m-1 flex flex-col items-center justify-center" title={state === 'error' ? 'Failed to load plugin! Check console for more information.' : ''}>
            {state === 'loading' ?
                <SvgSpinnersBarsFade />
                : <LoadingIcon />}
            <p className="text-center text-xs pointer-events-none">{name.toPascalCase()}</p>
        </div>
    }
    const { id, useableAsTool: selectable } = config;
    const label = (config.label ?? id).toPascalCase()

    return selectable ? (
        <div
            id={`plugin-${id}`}
            title={label}
            className={`flex justify-center items-center w-10 h-10 overflow-hidden m-1 rounded-lg bg-tldraw-tool-bg
                ${usePluginStore.getState().selected === config.id ? 'bg-tldraw-tool-selected' : 'hover:brightness-125'}`}
            onClick={() => setSelected(id)}
        >
            {icon ?
                <Image src={icon} alt={label ?? id} loading="lazy" />
                : label}
        </div>
    ) : <></>
}
export default Plugin;