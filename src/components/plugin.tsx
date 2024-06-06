'use client'

import BasePlugin from "@/plugins/base";
import { usePluginStore } from "@/stores/plugin";
import { useEffect, useState } from "react";

const Plugin = ({ name }: { name: string }) => {
    const { setSelected, register } = usePluginStore();
    const [plugin, setPlugin] = useState<BasePlugin>();

    // Loads the plugin module's default export and registers it to the pluginStore and local state
    useEffect(() => {
        import(`../plugins/${name}/plugin`)
            .then(({ default: plugin }) => {
                register(plugin);
                setPlugin(plugin);
            });
    }, [name, register, setPlugin])

    if (!plugin) {
        return <p>{`Loading\n${name}`}</p>
    } else if (!(plugin instanceof BasePlugin)) {
        return <p>{`Unable to load\n${name}`}</p>
    };
    const { id, label } = plugin.properties;

    return (
        <div id={`plugin-${id}`} className="flex justify-center items-center w-14 h-14 rounded overflow-hidden hover:brightness-125" onClick={() => {
            setSelected(id);
        }}>
            <p className="text-ellipsis absolute bottom-1 max-w-full overflow-hidden pointer-events-none">
                {label ?? id}
            </p>
        </div>
    )
}
export default Plugin;