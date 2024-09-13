import { usePluginStore } from "@/stores/plugin";
import { useTools, DefaultToolbar, TldrawUiMenuItem, useIsToolSelected, TLUiToolsContextType } from "tldraw"
const defaultTools: string[] = ['select', 'eraser']

const CustomTldrawUiMenuItem = ({ name }: { name: string}) => {
    const tools = useTools();    
    const isSelected = useIsToolSelected(tools[name]);
    return <TldrawUiMenuItem {...tools[name]} isSelected={isSelected} />;
}


// ! This component decides which tools are shown in the toolbar for the currently selected plugin based on its properties
const Toolbar = () => {    
    const { plugins, selected } = usePluginStore();
    const selectedPluginAvailableShapes = plugins.find(({ plugin: { properties: { id } } }) => id === selected)?.plugin.properties.availableShapes;
    
    const tools = useTools();
    console.debug(tools);

    return (
        <div>
            <DefaultToolbar>
                {[...defaultTools, ...selectedPluginAvailableShapes ?? []].map((name) => <CustomTldrawUiMenuItem name={name} key={name + 'uimenuitem'} />)}
            </DefaultToolbar>
        </div>
    )
}
export default Toolbar;