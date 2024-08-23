import { Editor, TLUiDialog, TLUiToolItem } from "tldraw";

export const ConveyorOverride = (editor: Editor): TLUiToolItem => ({
    id: 'conveyor',
    icon: 'tool-arrow',
    label: 'Conveyor Belt',
    kbd: 'c',
    onSelect: () => {
        editor.setCurrentTool('conveyor')
    },
});