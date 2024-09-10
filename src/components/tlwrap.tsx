'use client'

import { PluginStore, usePluginStore } from "@/stores/plugin";
import { Editor, TLArrowShape, Tldraw, TLGeoShape, TLShape, TLShapeId, VecModel } from "tldraw";
import Toolbar from "./toolbar";
import RectShapeUtil from "@/custom-shapes/rect/shapeUtil";
import ConveyorShapeUtil from "@/custom-shapes/conveyor/shapeUtil";
import RectShapeTool from "@/custom-shapes/rect/tool";
import ConveyorShapeTool from "@/custom-shapes/conveyor/tool";
import BasePlugin, { PluginData, PluginDataSchema, PluginPropsSchema } from "@/plugins/base";
import { z } from "zod";
import { unwrapShape } from "@/util/pluginUtil";
import { overrides } from "./overrides";
import { useRef } from "react";
import { useTldrawDarkModeObserver } from "@/hooks/useTldrawDarkmodeObserver";
import { getArrowCoordinates, getRectCoordinates, getShapeCoordinates, handleCollision } from "@/util/collision";
import { CollisionCallback, Polygon, polygonInCircle, Response, SATVector, System } from "detect-collisions";

export const ShapeMetaSchema = z.object({
    props: PluginPropsSchema,
    data: PluginDataSchema
});
export type ShapeMeta = z.infer<typeof ShapeMetaSchema>;


const Tlwrap = () => {
    const wrapperElRef = useRef<HTMLDivElement>(null);
    const { onTldrawMount } = useTldrawDarkModeObserver(wrapperElRef);
    const polyShapeMap = useRef<Map<TLShapeId, Polygon>>(new Map());
    const collisionTable = useRef<Map<TLShapeId, Set<TLShapeId>>>(new Map());
    const previousCollisions = useRef<Map<TLShapeId, Set<TLShapeId>>>(new Map());

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
                    const collisionSystem = new System();

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

                        const { selected, getPlugin } = usePluginStore.getState();
                        const { plugin } = getPlugin(selected) ?? {};

                        if (!plugin) {
                            console.warn('Unable to get current plugin info during shape creation!');
                            return shape.meta;
                        }
                        if (Object.keys(shape.meta).length > 0) {
                            console.log('KEEPING SHAPE META');
                            return shape.meta;
                        }

                        if (shape.type === 'arrow' && shape.isLocked) {
                            return shape.meta;
                        }

                        console.log('RECONFIGURING SHAPE META');

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

                    const onCollision = (shape: TLShape, plugin: BasePlugin, data?: PluginData, triggerEvents: boolean = true) => (response: Response) => {

                        const collidingId = Array.from(polyShapeMap.current.entries()).find(([, poly]) => poly === response.b)?.[0];
                        const compareShape = collidingId && editor.getShape(collidingId);
                        if (!compareShape) return;

                        const compareShapePluginStore = unwrapShape(compareShape);
                        if (!compareShapePluginStore) return;


                        const collisionsWithCompareShape =
                            collisionTable.current.get(collidingId) ?? new Set<TLShapeId>();
                        const collisionsWithShape =
                            collisionTable.current.get(shape.id) ?? new Set<TLShapeId>();

                        const wasColliding =
                            collisionsWithCompareShape.has(shape.id) ||
                            collisionsWithShape.has(collidingId);


                        if (!wasColliding) {


                            // Collision started, add collision to table and fire events
                            collisionsWithCompareShape.add(shape.id);
                            collisionsWithShape.add(collidingId);

                            if (triggerEvents) {
                                compareShapePluginStore.plugin.onCollisionStart(
                                    editor,
                                    {
                                        data: compareShapePluginStore.data,
                                        shape: compareShape,
                                    },
                                    {
                                        data: data,
                                        plugin: plugin,
                                        shape: shape,
                                    }
                                );

                                plugin.onCollisionStart(
                                    editor,
                                    {
                                        data: data,
                                        shape: shape,
                                    },
                                    {
                                        data: compareShapePluginStore.data,
                                        plugin: compareShapePluginStore.plugin,
                                        shape: compareShape,
                                    }
                                );
                            }

                        }
                        // Updates the collisiontable
                        collisionTable.current.set(shape.id, collisionsWithShape);
                        collisionTable.current.set(compareShape.id, collisionsWithCompareShape);

                        previousCollisions.current.set(shape.id, (previousCollisions.current.get(shape.id) ?? new Set()).add(compareShape.id));
                    }

                    /* https://tldraw.dev/examples/editor-api/store-events */
                    editor.store.listen(({ changes: { updated, removed, added } }) => {

                        // ! Updated
                        for (const [from, to] of (Object.values(updated) as [TLShape, TLShape][])) {
                            if (to.typeName !== 'shape') continue;


                            const shape = editor.getShape(to.id) as TLShape;

                            const { plugin, data } = unwrapShape(shape) ?? {};
                            if (!plugin) continue;


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
                                }
                            }

                            editor.bringToFront([to.id]);

                            // Collision Handling
                            const poly = polyShapeMap.current.get(shape.id);
                            const { origin, coords } = getShapeCoordinates(shape, editor);
                            poly?.setPosition(origin.x, origin.y);
                            poly?.setPoints(coords.map(({ x, y }) => new SATVector(x, y)));


                            const cachedShapeCollisions = collisionTable.current.get(shape.id);
                            const previousShapeCollisions = previousCollisions.current.get(shape.id) ?? new Set();
                            const difference = cachedShapeCollisions?.difference(previousShapeCollisions); // This is every cached collision that is not happening anymore and needs to be cleaned up

                            Array.from(difference?.values() ?? []).map((dirtyCollisionId) => {

                                // Remove the collisionId from own table entry and other references
                                collisionTable.current.get(dirtyCollisionId)?.delete(shape.id);
                                collisionTable.current.get(shape.id)?.delete(dirtyCollisionId);
                                console.log(`Removed connection from ${shape.id} to ${dirtyCollisionId}`);

                                const dirtyCollisionShape = editor.getShape(dirtyCollisionId);
                                if (!dirtyCollisionShape) return;

                                const dirtyCollisionShapePluginStore = unwrapShape(dirtyCollisionShape);
                                if (!dirtyCollisionShapePluginStore) return;
                                // Send events to both of them
                                dirtyCollisionShapePluginStore.plugin.onCollisionEnd(
                                    editor,
                                    {
                                        data: dirtyCollisionShapePluginStore.data,
                                        shape: dirtyCollisionShape,
                                    },
                                    {
                                        data: data,
                                        plugin: plugin,
                                        shape: shape,
                                    }
                                );

                                plugin.onCollisionEnd(
                                    editor,
                                    {
                                        data: data,
                                        shape: shape,
                                    },
                                    {
                                        data: dirtyCollisionShapePluginStore.data,
                                        plugin: dirtyCollisionShapePluginStore.plugin,
                                        shape: dirtyCollisionShape,
                                    }
                                );
                            })

                            previousCollisions.current.get(shape.id)?.clear();
                            poly && collisionSystem.checkOne(poly, (response) => {
                                onCollision(shape, plugin, data)(response);
                            });
                        }
                        // ! Added
                        for (const { id, meta, typeName } of Object.values(added)) {
                            if (typeName !== 'shape') continue;
                            const shape = editor.getShape(id) as TLShape; // Cast because it can't be undefined when the added event is fired

                            const { plugin, data } = unwrapShape(shape) ?? {};
                            if (!plugin) continue;
                            plugin.onCreate(editor, shape);
                            plugin.registerShape(id);

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

                            // Collision Handling
                            const { origin, coords } = getShapeCoordinates(shape, editor);
                            polyShapeMap.current.set(shape.id, collisionSystem.createPolygon(origin, coords));
                            const poly = polyShapeMap.current.get(shape.id);
                            if (!poly) continue;
                            collisionSystem.checkOne(poly, onCollision(shape, plugin, data, false));

                        }
                        // ! Removed
                        for (const { id, meta, typeName } of Object.values(removed)) {
                            if (typeName !== 'shape') continue;

                            // Sweeps all locked connector arrows that have no 2 binding points and cleans them up
                            const unboundConnectorArrows = editor.getCurrentPageShapes().filter(({ props, isLocked }) => {
                                return isLocked && ('end' in props && props.end.type === 'point' || 'start' in props && props.start.type === 'point')
                            });

                            editor
                                .updateShapes(unboundConnectorArrows
                                    .filter((shape): shape is TLArrowShape => !!shape)
                                    .map((shape) => ({
                                        ...shape,
                                        isLocked: false
                                    })))
                                .deleteShapes(unboundConnectorArrows);

                            const { plugin, data } = unwrapShape({ meta }) ?? {};

                            if (!plugin) {
                                console.warn(`Deleted shape did not have an associated plugin`);
                                return;
                            }

                            plugin.unregisterShape(id);
                            plugin.onDelete(editor, id, data);

                            // Collision Handling
                            const poly = polyShapeMap.current.get(id);
                            if (!poly) continue;
                            collisionSystem.remove(poly);
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