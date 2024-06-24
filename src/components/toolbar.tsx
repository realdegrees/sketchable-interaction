import { usePluginStore } from "@/stores/plugin";
import { useTools, DefaultToolbar, TldrawUiMenuItem, DefaultToolbarContent, useIsToolSelected } from "tldraw"
const toolList: string[] = ['rect']

// ! This component decides which tools are shown in the toolbar for the currently selected plugin based on its properties
const Toolbar = () => {
    const tools = useTools();
    const {plugins, selected} = usePluginStore();
    const selectedPluginAvailableShapes = plugins.find(({properties: {id}}) => id === selected)?.properties.availableShapes;
    const availableTools = ['select', 'eraser', ...toolList.filter((tool) => selectedPluginAvailableShapes?.includes(tool))];
    
    // TODO look for a way to circumvent react's hook order rule in order to not have to hardcode this
    const isRectSelected = useIsToolSelected(tools['rect']);
    
    return (
        <div>
            <DefaultToolbar>
                {['select', 'eraser'].map((tool) => <TldrawUiMenuItem key={`tool-${tool}`} {...tools[tool]} isSelected={useIsToolSelected.call(this, tools[tool])}/>)}
                {selectedPluginAvailableShapes?.includes('rect')  ? <TldrawUiMenuItem {...tools['rect']} isSelected={isRectSelected} /> : undefined}
            </DefaultToolbar>
        </div>
    )
}
export default Toolbar;