import { Editor, TLUiToolItem } from "tldraw";

export const RectOverride = (editor: Editor): TLUiToolItem => ({
    id: 'rect',
    icon: 'geo-rectangle',
    label: 'Rect',
    kbd: 'r',
    onSelect: () => {
        editor.setCurrentTool('rect')
    },
});