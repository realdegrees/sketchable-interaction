import { TLPointerEvent, TLUiToolItem, TldrawUiMenuItem } from "tldraw"
import Tool from "../base";

export default class Trash extends Tool {
    public properties: Required<Pick<TLUiToolItem<string, string>, "icon" | "kbd" | 'id'>> & { label: string; defaultTool?: string } = {
        icon: '',
        id: 'trash',
        kbd: 't',
        label: 'Trash'
    };

    override onPointerUp?: TLPointerEvent | undefined = (event) => {
        const { currentPagePoint } = this.editor.inputs;
        const info = this.getCurrent();
        console.log(info);
    };
}