import { ArrowShapeTool, BaseBoxShapeTool } from 'tldraw'
export class RectShapeTool extends BaseBoxShapeTool {
    static override id = 'rect'
    static override initial = 'idle'
    override shapeType = 'rect'

}
export class ConveyorShapeTool extends ArrowShapeTool {
    static override id = 'conveyor'
    static override initial = 'idle'
    override shapeType = 'arrow'

}