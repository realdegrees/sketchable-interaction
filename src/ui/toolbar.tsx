import { readdirSync } from "fs";
import dynamic from "next/dynamic";
import path from "path"
import { lazy } from "react";

const pluginDir = path.join(process.cwd(), 'src/tools');
const plugins = readdirSync(pluginDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => ({
        DynamicComponent: dynamic(() => import(`../tools/${dirent.name}/tool`), { ssr: false, loading: () => <p>Loading Tool</p> }),
        name: dirent.name
    }));

const Toolbar = () => {
    return (
        <main className="flex w-fit h-fit">
            {plugins.map(({ name, DynamicComponent }) => {
                return (
                    <div key={name} className="m-0.5">
                        <DynamicComponent />
                    </div>
                );
            })}
        </main>
    )
}
export default Toolbar;