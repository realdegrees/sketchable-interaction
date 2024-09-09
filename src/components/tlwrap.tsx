'use client'

import { PluginStore, usePluginStore } from "@/stores/plugin";
import { Editor, TLArrowShape, Tldraw, TLGeoShape, TLShape, TLShapeId, VecModel } from "tldraw";
import Toolbar from "./toolbar";
import RectShapeUtil from "@/custom-shapes/rect/shapeUtil";
import ConveyorShapeUtil from "@/custom-shapes/conveyor/shapeUtil";
import RectShapeTool from "@/custom-shapes/rect/tool";
import ConveyorShapeTool from "@/custom-shapes/conveyor/tool";
import { PluginData, PluginDataSchema, PluginPropsSchema } from "@/plugins/base";
import { z } from "zod";
import { unwrapShape } from "@/util/pluginUtil";
import { overrides } from "./overrides";
import { useRef } from "react";
import { useTldrawDarkModeObserver } from "@/hooks/useTldrawDarkmodeObserver";
import { handleCollision } from "@/util/collision";

export const ShapeMetaSchema = z.object({
    props: PluginPropsSchema,
    data: PluginDataSchema
});
export type ShapeMeta = z.infer<typeof ShapeMetaSchema>;


const Tlwrap = () => {
    const wrapperElRef = useRef<HTMLDivElement>(null);
    const { onTldrawMount } = useTldrawDarkModeObserver(wrapperElRef);
    const collisionTable = useRef<Map<TLShapeId, Set<TLShapeId>>>(new Map());

    return (
        <div className="fixed inset-0" ref={wrapperElRef}>

            <Tldraw
                inferDarkMode
                shapeUtils={[RectShapeUtil, ConveyorShapeUtil]} // TODO Add toolbar buttons for shapes
                tools={[RectShapeTool, ConveyorShapeTool]}
                overrides={overrides}
                components={{
                    Toolbar
                    // TODO override color/shape component as well to remove several options
                }}
                onMount={(editor) => {
                    onTldrawMount();

                    // Starts the interval for the tick function of plugins
                    setInterval(() => {
                        const { plugins } = usePluginStore.getState();
                        plugins.forEach(({ plugin }) => plugin.tick.call(plugin, editor));
                    }, 20);

                    /*  Retrieve the current plugin and attach its ID as meta-data to every new shape
                        Also inform the plugin that a shape has been created
                        https://tldraw.dev/docs/shapes#Meta-information   */
                    editor.getInitialMetaForShape = (shape) => {
                        console.log(shape);

                        const { selected, getPlugin } = usePluginStore.getState();
                        const { plugin } = getPlugin(selected) ?? {};

                        if (!plugin) {
                            console.warn('Unable to get current plugin info during shape creation!');
                            return shape.meta;
                        }
                        if (Object.keys(shape.meta).length > 0) {
                            return shape.meta;
                        }


                        const meta: ShapeMeta = {
                            props: plugin.properties,
                            data: {
                                state: {
                                    activeEffects: []
                                }
                            }
                        };

                        return meta;
                    }

                    /* https://tldraw.dev/examples/editor-api/store-events */
                    editor.store.listen(({ changes: { updated, removed, added } }) => {

                        // Updated
                        for (const [from, to] of (Object.values(updated) as [TLShape, TLShape][])) {
                            if (to.typeName !== 'shape') continue;


                            const shape = editor.getShape(to.id) as TLShape;

                            if (shape.type === 'arrow') {
                                const { isLocked, props } = shape as TLArrowShape;
                                const [SType, EType] = [props.start.type, props.end.type];

                                // Don't meddle with unlocked arrows as they might be regular plugin shapes
                                if (isLocked) {
                                    editor.sendToBack([shape]);
                                    if (SType !== 'binding' || EType !== 'binding') {
                                        editor.updateShape({
                                            ...shape,
                                            isLocked: false
                                        }).deleteShape(shape);
                                    }
                                    return;
                                };
                            }


                            const shapeMoved = from.x !== to.x || from.y !== to.y;
                            const shapeResized = 'w' in from.props && 'w' in to.props && from.props.w !== to.props.w
                                || 'h' in from.props && 'h' in to.props && from.props.h !== to.props.h;

                            if (shapeMoved || shapeResized) {
                                // If a shape's position is updated recheck collision state
                                handleCollision(editor, shape, collisionTable.current); // ! Might be too much of a performance hit here (move to pointer up if so)
                            }
                        }
                        // Added
                        for (const { id, meta, typeName } of Object.values(added)) {
                            if (typeName !== 'shape') continue;
                            const shape = editor.getShape(id) as TLShape; // Cast because it can't be undefined when the added event is fired

                            const { plugin } = unwrapShape(shape) ?? {};
                            plugin?.onCreate(editor, shape);
                            plugin?.registerShape(id);

                            console.log('Checking collisions');

                            // If a shape's position is updated recheck collision state
                            handleCollision(editor, shape, collisionTable.current); // ! Might be too much of a performance hit here (move to pointer up if so)
                        }
                        // Removed
                        for (const { id, meta, typeName } of Object.values(removed)) {
                            if (typeName !== 'shape') continue;


                            // Get connected arrows, unlock them, delete them
                            const arrows = editor.getArrowsBoundTo(id).map(({ arrowId }) => arrowId);

                            editor
                                .updateShapes(arrows
                                    .map((id) => editor.getShape(id))
                                    .filter((shape): shape is TLArrowShape => !!shape)
                                    .map((shape) => ({
                                        ...shape,
                                        isLocked: false
                                    })))
                                .deleteShapes(arrows);

                            const { plugin, data } = unwrapShape({ meta }) ?? {};

                            if (!plugin) {
                                console.warn(`Deleted shape did not have an associated plugin`);
                                return;
                            }

                            plugin.onDelete(id, data);
                            plugin.unregisterShape(id);// ! Might be too much of a performance hit here (move to pointer up if so)

                            handleCollision(editor, { id, meta } as TLShape, collisionTable.current);
                        }
                    })

                    /* https://tldraw.dev/docs/editor#Side-effects */
                    // editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
                    //   if (shape.type === 'draw') {
                    //     shapeIDs.push(shape.id);
                    //   }
                    // })

                    /* https://tldraw.dev/examples/editor-api/canvas-events*/
                    editor.on('event', ({ type, name }) => {
                        if (type === 'pointer' && name === 'pointer_up') {


                        }
                    })
                }} />
        </div>
    )
}
export default Tlwrap;