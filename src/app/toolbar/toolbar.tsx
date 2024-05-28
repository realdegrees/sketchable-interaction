import { readdirSync } from "fs";
import dynamic from "next/dynamic";
import path from "path";
import { ComponentType, RefObject, createRef } from "react";
import { DefaultToolbar, TldrawUiMenuItem, useTools } from "tldraw";

const toolDir = path.join(process.cwd(), 'src/app/toolbar/tools');
const tools = readdirSync(toolDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => ({
        DynamicComponent: dynamic(() => import(`./tools/${dirent.name}/tool`), { ssr: false, loading: () => <p>Loading Tool</p> }),
        name: dirent.name
    }));

const Toolbar = () => {
    return (
        <DefaultToolbar>
            {tools.map(({ DynamicComponent, name }) => {
                return <DynamicComponent key={name}/>;
            })}
        </DefaultToolbar>
    )
}
export default Toolbar;