import { useTools, DefaultToolbar, TldrawUiMenuItem, DefaultToolbarContent, useIsToolSelected } from "tldraw"
const toolList: string[] = ['select', 'eraser', 'rectangle', 'ellipse']
const Toolbar = () => {
    const tools = useTools();
    return (
        <div>
            <DefaultToolbar>
                {toolList.map((tool) => <TldrawUiMenuItem key={`tool-${tool}`} {...tools[tool]} isSelected={useIsToolSelected.call(this, tools[tool])}/>)}
            </DefaultToolbar>
        </div>
    )
}
export default Toolbar;