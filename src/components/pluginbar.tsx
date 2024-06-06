import BasePlugin from "@/plugins/base";
import { readdir } from "fs/promises";
import path from "path";
import Plugin from "./plugin";
import CurrentPluginDisplay from "./currentPluginDisplay";

// Imports all
const pluginDir = path.join(process.cwd(), 'src/plugins');
const loadPlugins = readdir(pluginDir, { withFileTypes: true })
    .then((dirent) => Promise.all<BasePlugin>(dirent
        .filter(dirent => dirent.isDirectory())
        .map(async dirent => (await import(`../plugins/${dirent.name}/plugin`)).default)));

// ! TODO: Dynamically adjust available tools when selecting a plugin (e.g. only rectangle for folder tool or only (customized-)draw tool for conveyor belt)

const PluginBar = async () => {
    const plugins = await loadPlugins;
    
    // TODO get editor reference (might have to put PluginBar inside of tldraw context)

    return (
        <div id="pluginbar" className="absolute bottom-20 left-1/2 -translate-x-1/2 flex">
            <CurrentPluginDisplay />
            {
                // ! Can pass funcion references here if needed as passing the entire instance is not supported in react
                plugins.map(({ id, properties }) => <Plugin key={id} props={properties} />)
            }
        </div>
    )
}
export default PluginBar;