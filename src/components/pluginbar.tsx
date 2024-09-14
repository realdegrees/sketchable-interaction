import path from "path";
import Plugin from "./plugin";
import { readdirSync } from "fs";

// Imports all
const pluginDir = path.join(process.cwd(), 'src/plugins');
const pluginPaths = readdirSync(pluginDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);


const PluginBar = () => {
    return (
        <div className="flex flex-col absolute top-2 left-1/2 -translate-x-1/2 z-50">
            <div id="pluginbar" className="flex bg-tldraw-tool-bg rounded-xl border border-opacity-25 border-zinc-100 shadow-sm shadow-slate-900">
                {
                    // Iterates the pluginPaths, loads each plugin and when all are loaded register them and emit that the pluginstore is ready
                    pluginPaths.map((name) => <Plugin key={name} name={name} total={pluginPaths.length} />)
                }
            </div>
        </div>
    )
}
export default PluginBar;