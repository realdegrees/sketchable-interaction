import { usePluginStore } from "@/stores/plugin";
import { useTools, DefaultToolbar, TldrawUiMenuItem, DefaultToolbarContent, useIsToolSelected } from "tldraw"
const toolList: string[] = ['rect', 'conveyor']
const defaultTools: string[] = ['select', 'eraser']
// ! This component decides which tools are shown in the toolbar for the currently selected plugin based on its properties
const Toolbar = () => {
    const tools = useTools();
    console.log(tools);
    
    const { plugins, selected } = usePluginStore();
    const selectedPluginAvailableShapes = plugins.find(({ plugin: { properties: { id } } }) => id === selected)?.plugin.properties.availableShapes;

    // TODO look for a way to circumvent react's hook order rule in order to not have to hardcode this
    const isRectSelected = useIsToolSelected(tools['rect']);
    const isConveyorSelected = useIsToolSelected(tools['conveyor']);

    return (
        <div>
            <DefaultToolbar>
                {defaultTools.map((tool) => <TldrawUiMenuItem key={`tool-${tool}`} {...tools[tool]} isSelected={useIsToolSelected.call(this, tools[tool])} />)}
                {selectedPluginAvailableShapes?.includes('rect') ? <TldrawUiMenuItem {...tools['rect']} isSelected={isRectSelected} /> : undefined}
                {selectedPluginAvailableShapes?.includes('conveyor') ? <TldrawUiMenuItem {...tools['conveyor']} isSelected={isConveyorSelected} /> : undefined}
            </DefaultToolbar>
        </div>
    )
}
export default Toolbar;