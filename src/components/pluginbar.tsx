import BasePlugin from "@/plugins/base";
import { readdir } from "fs/promises";
import path from "path";
import Plugin from "./plugin";
import { readdirSync } from "fs";

// Imports all
const pluginDir = path.join(process.cwd(), 'src/plugins');
const pluginPaths = readdirSync(pluginDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

// ! This could also be represented as a custom styles panel in tldraw https://github.com/tldraw/tldraw/blob/main/apps/examples/src/examples/shape-with-custom-styles/ShapeWithCustomStylesExample.tsx
// ! TODO: Dynamically adjust available tools when selecting a plugin (e.g. only rectangle for folder tool or only (customized-)draw tool for conveyor belt)
const PluginBar = () => {
    // TODO get editor reference (might have to put PluginBar inside of tldraw context)
    return (
        <div className="flex flex-col absolute bottom-28 left-1/2 -translate-x-1/2 ">
            <div id="pluginbar" className="flex bg-zinc-900 rounded-lg border border-opacity-25 border-zinc-100">
                {
                    // ! Can pass funcion references here if needed as passing the entire instance is not supported in react
                    pluginPaths.map((name) => <Plugin key={name} name={name} />)
                }
            </div>
        </div>
    )
}
export default PluginBar;