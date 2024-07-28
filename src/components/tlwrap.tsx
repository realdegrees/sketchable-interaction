'use client'

import { PluginStore, usePluginStore } from "@/stores/plugin";
import { Editor, TLArrowShape, Tldraw, TLDrawShape, TLShape, TLShapeId } from "tldraw";
import Toolbar from "./toolbar";
import RectShapeUtil from "@/shapes/rect";
import { setTimeout } from "timers";
import BasePlugin, { PluginDataSchema, PluginPropsSchema } from "@/plugins/base";
import { z } from "zod";
import { unwrapShape } from "@/util/pluginUtil";
import { RectShapeTool } from "./tools";
import { uiOverrides } from "./uiOverrides";
import { MutableRefObject, useRef } from "react";
import { useTldrawDarkModeObserver } from "@/hooks/useTldrawDarkmodeObserver";

export const ShapeMetaSchema = z.object({
    props: PluginPropsSchema,
    data: PluginDataSchema
});
export type ShapeMeta = z.infer<typeof ShapeMetaSchema>;

const handleCollision = (editor: Editor, collidingShapesRef: MutableRefObject<Map<TLShapeId, Set<TLShapeId>>>) => {
    // Retrieve all shapes from the current page
    const allShapes = editor.getCurrentPageShapesSorted();

    // Filter only shapes that are currently on screen
    // TODO might have to remove filter if e.g. conveyor belt is supposed to function outside of view
    const viewportBounds = editor.getViewportPageBounds()
    const shapesinViewport = allShapes.filter((shape) => {
        const shapeBounds = editor.getShapePageBounds(shape);
        return shapeBounds && viewportBounds.collides(shapeBounds);
    });

    // Simple collision check between all shapes with bounding box
    // TODO if required this can be moved to a store update event (filter shape updates) to detect collision while moving
    /* Regarding usability the above todo sounds counter intuitive though as I wouldn't want to delete something by accident just because I dragged it over the other box
      Ideally keep collision checks to pointer up events AND to shape update events with conveyer belt meta tag
    */
    // ! find a way to reduce the complexity of this operation, find literature on runtime complexity in collision detection

    // TODO this won't work with paths e.g. conveyor belt, in order to keep performance clean maybe replace conveyor belt line with small (relatively) rectangles while drawing and rotate them to resemble a line and group them afterwards
    shapesinViewport.forEach((shape) => {
        // ! comparing every shape to every other shape will not be necessary if collision is only tested on mouse up (only compare dragged shape to every other shape O(N²) vs O(N))
        const shapeBounds = editor.getShapePageBounds(shape);

        // Unwrap shape
        const unwrappedShape = unwrapShape(shape);
        if (!unwrappedShape) {
            return;
        }

        const previousCollisions = collidingShapesRef.current.get(shape.id) ?? new Set<TLShapeId>();

        // Sort shapes into colliding and non-colliding
        const colliding: TLShape[] = [];
        const notColliding: TLShape[] = [];
        for (const compareShape of shapesinViewport) {
            if (shape === compareShape) continue;

            const compareShapeBounds = editor.getShapePageBounds(compareShape);
            if (shapeBounds && compareShapeBounds?.collides(shapeBounds)) {
                colliding.push(compareShape);
            } else {
                notColliding.push(compareShape);
            }
        }

        // Handle all collision start events
        colliding.filter(({ id }) => !previousCollisions.has(id)).forEach((enteringShape) => {
            const unwrappedEnteringShape = unwrapShape(enteringShape);
            if (!unwrappedEnteringShape) {
                return;
            }
            previousCollisions.add(enteringShape.id)
            collidingShapesRef.current.set(shape.id, previousCollisions);
            // Let the plugin handle the collision
            unwrappedShape.plugin.onCollisionStart(editor, {
                data: unwrappedShape.data,
                shape
            }, {
                data: unwrappedEnteringShape.data,
                plugin: unwrappedEnteringShape.plugin,
                shape: enteringShape
            }, 'user');

            // TODO if the shape has a conveyor belt plugin meta tag then give the colliding shape a corresponding meta tag that indicates it's currently being moved. These items can then be filtered in store events to reduce performance impact
        })

        // Handle all collision end events
        notColliding.filter(({ id }) => previousCollisions.has(id)).forEach((leavingShape) => {
            const unwrappedLeavingShape = unwrapShape(leavingShape);
            if (!unwrappedLeavingShape) {
                return;
            }
            previousCollisions.delete(leavingShape.id);
            collidingShapesRef.current.set(shape.id, previousCollisions);
            unwrappedShape.plugin.onCollisionEnd(editor, {
                data: unwrappedShape.data,
                shape
            }, {
                data: unwrappedLeavingShape.data,
                plugin: unwrappedLeavingShape.plugin,
                shape: leavingShape
            }, 'user');
        })
    })
}
const Tlwrap = () => {
    const wrapperElRef = useRef<HTMLDivElement>(null);
    const { onTldrawMount } = useTldrawDarkModeObserver(wrapperElRef);





    const hoveredShapeRef = useRef<{
        id: TLShapeId,
        plugin: BasePlugin
    } | undefined>(undefined);

    const collidingShapesRef = useRef<Map<TLShapeId, Set<TLShapeId>>>(new Map());

    return (
        <div className="fixed inset-0" ref={wrapperElRef}>
            <Tldraw
                inferDarkMode
                shapeUtils={[RectShapeUtil]} // TODO Add toolbar buttons for shapes
                tools={[RectShapeTool]}
                overrides={uiOverrides}
                components={{
                    Toolbar
                    // TODO override color/shape component as well to remove several options
                }}
                onMount={(editor) => {
                    onTldrawMount();

                    /*  Retrieve the current plugin and attach its ID as meta-data to every new shape
                        Also inform the plugin that a shape has been created
                        https://tldraw.dev/docs/shapes#Meta-information   */
                    editor.getInitialMetaForShape = (shape) => {
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
                        handleCollision(editor, collidingShapesRef); // ! Might be too much of a performance hit here (move to pointer up if so)

                        // Updated
                        for (const [, { typeName, id }] of Object.values(updated)) {
                            if (typeName !== 'shape') continue;
                            const shape = editor.getShape(id) as TLShape;

                            switch (shape.type) {
                                // Delete when the anchors of a locked arrow change to non-binding
                                case 'arrow': {
                                    const { isLocked, props } = shape as TLArrowShape;
                                    const [SType, EType] = [props.start.type, props.end.type];
                                    if (isLocked && (SType !== 'binding' || EType !== 'binding')) {
                                        editor.updateShape({
                                            ...shape,
                                            isLocked: false
                                        }).deleteShape(shape);
                                    }
                                    break;
                                }
                                default: {
                                    const { plugin } = unwrapShape(shape) ?? {};
                                    plugin?.onCreate(editor, shape);
                                    plugin?.registerShape(id);
                                    break;
                                }
                            }
                        }
                        // Added
                        for (const { id, meta, typeName } of Object.values(added)) {
                            if (typeName !== 'shape') continue;
                            const shape = editor.getShape(id) as TLShape; // Cast because it can't be undefined when the added event is fired

                            const { plugin } = unwrapShape(shape) ?? {};
                            plugin?.onCreate(editor, shape);
                            plugin?.registerShape(id);
                        }
                        // Removed
                        for (const { id, meta, typeName } of Object.values(removed)) {
                            if (typeName !== 'shape') continue;

                            // Get connected arrows, unlock them, delete them
                            const arrows = editor.getArrowsBoundTo(id).map(({ arrowId }) => arrowId);
                            console.log(arrows);

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
                            plugin.unregisterShape(id);
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