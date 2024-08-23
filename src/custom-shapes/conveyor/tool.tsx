import { ShapePropsType, StateNode, TLArrowShape, TLPointerEvent, TLShapeId, Vec } from "tldraw"

export default class ConveyorShapeTool extends StateNode {
    static override id = 'conveyor';
    static override initial = 'idle';
    override shapeType = 'conveyor';

    private currentArrow: TLArrowShape | undefined;

    // TODO change to several rectangles that get placed along the mouse trail while held down
    /*
        - Variable drawing
        - on mouse up group boxes and register them with conveyor plugin
    */

    onPointerDown = () => {
        const { x, y, z } = this.editor.inputs.currentPagePoint;
        const id = ('shape:' + Date.now() + [x, y, z].toString()) as TLShapeId;
        this.editor.createShape({
            id,
            type: 'arrow',
            x,
            y,
            props: {
                arrowheadEnd: 'triangle',
                arrowheadStart: 'pipe',
                size: 'xl',
                dash: 'dashed',
                bend: 0,
                fill: 'pattern',
                font: 'draw',
            }
            // Define additional properties for your shape here
        });
        this.currentArrow = this.editor.getShape(id);
    };
    onPointerUp?: TLPointerEvent | undefined = () => {
        this.currentArrow = undefined;
        this.editor.setCurrentTool('select');
        // TODO: add logic to bind arrow's end to hoveredshape
    };
    onPointerMove?: TLPointerEvent | undefined = () => {
        this.currentArrow = this.currentArrow && this.editor.getShape(this.currentArrow.id);

        if (!this.currentArrow || this.currentArrow.props.start.type !== 'point') {
            this.currentArrow = undefined;
            return;
        };

        
        const { x, y } = Vec.Sub(this.editor.inputs.currentPagePoint, new Vec(this.currentArrow.x, this.currentArrow.y));

        this.editor.updateShape<TLArrowShape>({
            ...this.currentArrow,
            props: {
                ...this.currentArrow.props,
                end: {
                    type: 'point',
                    x,
                    y
                }
            }
        });        
    };


    onEnter = () => {
        this.editor.setCursor({ type: 'cross', rotation: 0 });
    };
}