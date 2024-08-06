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

const handleCollision = (editor: Editor, compareShape: TLShape, collisionTable: MutableRefObject<Map<TLShapeId, Set<TLShapeId>>>) => {

    // Unwrap shape
    const compareShapePluginStore = unwrapShape(compareShape);
    if (!compareShapePluginStore) return;


    // Retrieve all shapes from the current page
    const allShapes = editor.getCurrentPageShapesSorted().filter(({type, opacity}) => type !== 'arrow' && opacity > 0);
    const collisionsWithCompareShape = collisionTable.current.get(compareShape.id) ?? new Set<TLShapeId>();
    const compareShapeBounds = editor.getShapePageBounds(compareShape);

    // ! find a way to reduce the complexity of this operation, find literature on runtime complexity in collision detection
    // ? Found a way by only checking collision for shapes that were updated, complexity is O(x*n) where x = number of updated shapes and n is all shapes


    // Iterate all shapes and check if they collide with the compareShape
    allShapes.forEach((shape) => {
        if (shape.id === compareShape.id) return;

        // Unwrap shape
        const shapePluginStore = unwrapShape(shape);
        if (!shapePluginStore) return;

        const collisionsWithShape = collisionTable.current.get(shape.id) ?? new Set<TLShapeId>();
        const shapeBounds = editor.getShapePageBounds(shape);

        const isColliding = compareShapeBounds && shapeBounds?.collides(compareShapeBounds);
        const wasColliding = collisionsWithCompareShape.has(shape.id) || collisionsWithShape.has(compareShape.id);

        if(isColliding) {
            console.log(shapeBounds);
            console.log(compareShapeBounds);
            
        }
        
        // Don't do anything if the shapes were already colliding and still are colliding
        if (wasColliding && isColliding) return;
        // Same if they were not colliding and still don't
        if (!wasColliding && !isColliding) return;

        if (!wasColliding && isColliding) {
            // Collision started, add collision to table and fire events
            collisionsWithCompareShape.add(shape.id);
            collisionsWithShape.add(compareShape.id);

            compareShapePluginStore.plugin.onCollisionStart(editor, {
                data: compareShapePluginStore.data,
                shape
            }, {
                data: shapePluginStore.data,
                plugin: shapePluginStore.plugin,
                shape: shape
            }, 'user');

            shapePluginStore.plugin.onCollisionStart(editor, {
                data: shapePluginStore.data,
                shape
            }, {
                data: compareShapePluginStore.data,
                plugin: compareShapePluginStore.plugin,
                shape: compareShape
            }, 'user');

        } else if (wasColliding && !isColliding) {
            // Collision stopped, remove collision from table and fire events
            collisionsWithCompareShape.delete(shape.id);
            collisionsWithShape.delete(compareShape.id);

            compareShapePluginStore.plugin.onCollisionEnd(editor, {
                data: compareShapePluginStore.data,
                shape
            }, {
                data: shapePluginStore.data,
                plugin: shapePluginStore.plugin,
                shape: shape
            }, 'user');

            shapePluginStore.plugin.onCollisionEnd(editor, {
                data: shapePluginStore.data,
                shape
            }, {
                data: compareShapePluginStore.data,
                plugin: compareShapePluginStore.plugin,
                shape: compareShape
            }, 'user');
        }

        // Updates the collisiontable
        collisionTable.current.set(shape.id, collisionsWithShape);
        collisionTable.current.set(compareShape.id, collisionsWithCompareShape);
    })
}
const Tlwrap = () => {
    const wrapperElRef = useRef<HTMLDivElement>(null);
    const { onTldrawMount } = useTldrawDarkModeObserver(wrapperElRef);





    const hoveredShapeRef = useRef<{
        id: TLShapeId,
        plugin: BasePlugin
    } | undefined>(undefined);

    const collisionTable = useRef<Map<TLShapeId, Set<TLShapeId>>>(new Map());

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
                        if (Object.keys(shape.meta).length > 0 || shape.type === 'arrow') {
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

                            const shapeMoved = from.x !== to.x || from.y !== to.y;
                            const shapeResized = 'width' in from.props && 'width' in to.props && from.props.width !== to.props.width
                                || 'height' in from.props && 'height' in to.props && from.props.height !== to.props.height;

                            if (shapeMoved || shapeResized) {                                
                                // If a shape's position is updated recheck collision state
                                handleCollision(editor, shape, collisionTable); // ! Might be too much of a performance hit here (move to pointer up if so)
                            }


                            switch (shape.type) {
                                // Delete when the anchors of a locked arrow change to non-binding
                                case 'arrow': {
                                    const { isLocked, props } = shape as TLArrowShape;
                                    const [SType, EType] = [props.start.type, props.end.type];
                                    if (SType !== 'binding' || EType !== 'binding') {
                                        if (isLocked) {
                                            editor.updateShape({
                                                ...shape,
                                                isLocked: false
                                            }).deleteShape(shape);
                                        } else {
                                            editor.sendToBack([shape]);
                                        }
                                    }

                                    break;
                                }
                                default: {
                                    const { plugin } = unwrapShape(shape) ?? {};
                                    plugin?.onCreate(editor, shape);
                                    plugin?.registerShape(to.id);
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