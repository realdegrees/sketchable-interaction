import { BaseBoxShapeTool } from 'tldraw'
export class RectShapeTool extends BaseBoxShapeTool {
    static override id = 'rect'
    static override initial = 'idle'
    override shapeType = 'rect'

}