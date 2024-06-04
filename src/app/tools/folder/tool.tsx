import { TLPointerEvent, TLUiToolItem, TldrawUiMenuItem } from "tldraw"
import Tool from "../base";

export default class Folder extends Tool {
    public properties: Required<Pick<TLUiToolItem<string, string>, "icon" | "kbd">> & { label: string; defaultTool?: string } = {
        icon: '',
        kbd: 'f',
        label: 'Folder'
    };

    override onPointerUp?: TLPointerEvent | undefined = (event) => {
        const { currentPagePoint } = this.editor.inputs;
        const info = this.getCurrent();
        console.log(info);
    };
}