import { DrawShapeTool, TLUiToolItem } from "tldraw";

export default abstract class Tool extends DrawShapeTool {
    public abstract properties: Required<Pick<TLUiToolItem, 'icon' | 'kbd'>> & { label: string; defaultTool?: string };

    // TODO create an abstract method along the lines of "onShapeIntersect" that gets triggered when the move tool fires a collision event
}