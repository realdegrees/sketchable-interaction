'use client'

import { usePluginStore } from "@/stores/plugin";
import { Editor, JsonObject, TLArrowShape, Tldraw, TLRecord, TLShape, TLShapeId } from "tldraw";
import Toolbar from "./toolbar";
import RectShapeUtil from "@/custom-shapes/rect/shapeUtil";
import ConveyorShapeUtil from "@/custom-shapes/conveyor/shapeUtil";
import RectShapeTool from "@/custom-shapes/rect/tool";
import ConveyorShapeTool from "@/custom-shapes/conveyor/tool";
import BasePlugin from "@/plugins/base";
import { MetaPayload, PluginUtil } from "@/util/pluginUtil";
import { overrides } from "./overrides";
import { useRef, useState } from "react";
import { useTldrawDarkModeObserver } from "@/hooks/useTldrawDarkmodeObserver";
import { getShapeCoordinates } from "@/util/collision";
import { Polygon, Response, SATVector, System } from "detect-collisions";



const Tlwrap = () => {
    const wrapperElRef = useRef<HTMLDivElement>(null);
    const { onTldrawMount } = useTldrawDarkModeObserver(wrapperElRef);
    const polyShapeMap = useRef<Map<TLShapeId, Polygon>>(new Map());
    const collisionTable = useRef<Map<TLShapeId, Set<TLShapeId>>>(new Map());
    const previousCollisions = useRef<Map<TLShapeId, Set<TLShapeId>>>(new Map());
    const { eventEmitter: pluginStoreEventEmitter } = usePluginStore();
    const [collisionSystem, setCollisionSystem] = useState(new System());



    const updateCollision = async (editor: Editor, shape: TLShape) => {
        const { plugin, data } = PluginUtil.unwrapShape(shape) ?? {};
        if (!plugin) return;

        // Collision Handling
        const poly = polyShapeMap.current.get(shape.id);
        const { origin, coords } = getShapeCoordinates(shape, editor);
        poly?.setPosition(origin.x, origin.y);
        poly?.setPoints(coords.map(({ x, y }) => new SATVector(x, y)));

        const getDifference = (a?: Set<unknown>, b?: Set<unknown>): Set<unknown> => {
            const difference = new Set();
            const [largerSet, smallerSet] = ((a?.size ?? -Infinity) > (b?.size ?? -Infinity)) ? [a, b] : [b, a];
            largerSet?.forEach((item) => {
                if (!smallerSet?.has(item)) {
                    difference.add(item);
                }
            })

            return difference;
        }


        const cachedShapeCollisions = collisionTable.current.get(shape.id);
        const previousShapeCollisions = previousCollisions.current.get(shape.id) ?? new Set();
        const difference = getDifference(cachedShapeCollisions, previousShapeCollisions) as Set<TLShapeId>; // This is every cached collision that is not happening anymore and needs to be cleaned up

        await Promise.all(Array.from(difference?.values() ?? []).map(async (dirtyCollisionId) => {

            // Remove the collisionId from own table entry and other references
            collisionTable.current.get(dirtyCollisionId)?.delete(shape.id);
            collisionTable.current.get(shape.id)?.delete(dirtyCollisionId);

            const dirtyCollisionShape = editor.getShape(dirtyCollisionId);
            if (!dirtyCollisionShape) return;

            const dirtyCollisionShapePluginStore = PluginUtil.unwrapShape(dirtyCollisionShape);
            if (!dirtyCollisionShapePluginStore?.plugin) return;

            // Send events to both of them
            await plugin.onCollisionEnd(
                data,
                {
                    data: dirtyCollisionShapePluginStore.data,
                    plugin: dirtyCollisionShapePluginStore.plugin,
                    shape: dirtyCollisionShape,
                }
            );

            await dirtyCollisionShapePluginStore.plugin.onCollisionEnd(
                data,
                {
                    data: data,
                    plugin: plugin,
                    shape: shape,
                }
            );


        }));

        previousCollisions.current.get(shape.id)?.clear();
        poly && collisionSystem.checkOne(poly, (response) => {
            onCollision(editor, shape, plugin, data)(response);
        });
    }
    const onCollision = (editor: Editor, shape: TLShape, plugin: BasePlugin, data?: JsonObject, triggerEvents: boolean = true) => async (response: Response) => {

        const collidingId = Array.from(polyShapeMap.current.entries()).find(([, poly]) => poly === response.b)?.[0];
        const compareShape = collidingId && editor.getShape(collidingId);
        if (!compareShape) return;

        const compareShapePluginStore = PluginUtil.unwrapShape(compareShape);
        if (!compareShapePluginStore?.plugin) return;


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
                await plugin.onCollisionStart(
                    data,
                    {
                        data: compareShapePluginStore.data,
                        plugin: compareShapePluginStore.plugin,
                        shape: compareShape,
                    }
                );

                await compareShapePluginStore.plugin.onCollisionStart(
                    compareShapePluginStore.data,
                    {
                        data: data,
                        plugin: plugin,
                        shape: shape,
                    }
                );
            }

        }
        // Updates the collisiontable
        collisionTable.current.set(shape.id, collisionsWithShape);
        collisionTable.current.set(compareShape.id, collisionsWithCompareShape);

        previousCollisions.current.set(shape.id, (previousCollisions.current.get(shape.id) ?? new Set()).add(compareShape.id));
    }

    const cleanup = (editor: Editor) => {
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
    }

    const initCollision = (editor: Editor, shape: TLShape, options: { check: boolean } = { check: true }): void => {
        // Collision Handling
        const { origin, coords } = getShapeCoordinates(shape, editor);
        polyShapeMap.current.set(shape.id, collisionSystem.createPolygon(origin, coords));
        const poly = polyShapeMap.current.get(shape.id);
        if (!poly) return;

        console.debug(`Loaded in collision system: ${shape.id}`);

        if (!options.check) return;
        updateCollision(editor, shape);
    }

    return (
        <div className="fixed inset-0" ref={wrapperElRef}>

            <Tldraw
                inferDarkMode
                shapeUtils={[RectShapeUtil, ConveyorShapeUtil]} // TODO Add toolbar buttons for shapes
                tools={[RectShapeTool, ConveyorShapeTool]}
                overrides={overrides}
                persistenceKey="si"
                components={{
                    Toolbar
                    // TODO override color/shape component as well to remove several options
                }}

                onMount={(editor) => {
                    onTldrawMount(); // Sets darkmode refs
                    PluginUtil.setEditor(editor);

                    pluginStoreEventEmitter.on('ready', () => {
                        console.debug(`Starting collision setup`)
                        editor.getCurrentPageShapes().forEach((shape) => {
                            console.debug(`Collision setup for ${shape.id}`)
                            const { plugin } = PluginUtil.unwrapShape(shape) ?? {};
                            if (!plugin) return;
                            console.log('Editor set for ' + shape.id);

                            plugin.setEditor(editor);
                            initCollision(editor, shape);
                            console.debug('Success');
                        });
                        cleanup(editor);
                    })




                    /*  Retrieve the current plugin and attach its ID as meta-data to every new shape
                        Also inform the plugin that a shape has been created
                        https://tldraw.dev/docs/shapes#Meta-information   */
                    editor.getInitialMetaForShape = (shape) => {

                        const { selected, getPluginConfig } = usePluginStore.getState();
                        const config = selected && getPluginConfig(selected);


                        if (!config) {
                            console.warn('Unable to get active plugin config during shape creation!');
                            return shape.meta;
                        }
                        if (Object.keys(shape.meta).length > 0) {
                            return shape.meta;
                        }

                        if (shape.type === 'arrow' && shape.isLocked) {
                            return shape.meta;
                        }


                        // Essential, store plugin config as "config" property on the shape meta which gets saved by tldraw
                        const meta: MetaPayload = {
                            config: {
                                ...config,
                                pluginDataSchema: null // Schema is not json serializable so it's ignored here
                            },
                        };

                        return meta;
                    }

                    /* https://tldraw.dev/examples/editor-api/store-events */
                    editor.store.listen(({ changes: { updated, removed, added } }) => {

                        // Sort event values to prioritize selected shapes
                        const selectedShapes = editor.getSelectedShapes().map(({ id }) => id);
                        const sortedUpdate = Object.values(updated).filter(([, to]) => to.typeName === 'shape').sort(([{ id }]) => selectedShapes.includes(id as TLShapeId) ? 1 : -1);
                        const sortedRemoved = Object.values(removed).filter((r): r is TLRecord => r.typeName === 'shape').sort(({ id }) => selectedShapes.includes(id as TLShapeId) ? 1 : -1);
                        const sortedAdded = Object.values(added).filter((a): a is TLShape => a.typeName === 'shape').sort(({ id }) => selectedShapes.includes(id as TLShapeId) ? 1 : -1);

                        // ! Updated
                        for (const [, shape] of (sortedUpdate as [TLShape, TLShape][])) {
                            const { plugin } = PluginUtil.unwrapShape(shape) ?? {};
                            plugin?.onShapeUpdate(shape);

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
                                    continue;
                                }
                            }

                            updateCollision(editor, shape);
                        }

                        // ! Added
                        for (const shape of sortedAdded) {
                            // Handle helper arrows first
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
                                    continue;
                                };
                            }
                            let { config, plugin } = PluginUtil.unwrapShape<JsonObject, BasePlugin>(shape) ?? {};

                            if (!config || !plugin) {
                                console.error(`Attempted to create plugin for shape ${shape.id} but there was no config or class constructor!`);
                                continue;
                            }

                            plugin.setEditor(editor);
                            editor.bringToFront([shape.id]);
                            initCollision(editor, shape);
                        }
                        // ! Removed
                        for (const { id, meta } of sortedRemoved) {
                            // Remove instance reference in pluginStore, send onDelete event, let plugin get garbage collected
                            usePluginStore.getState().unregisterInstance(id as TLShapeId);
                            const { plugin, data } = PluginUtil.unwrapShape({ meta, id: id as TLShapeId }) ?? {};
                            if (!plugin) continue;
                            plugin.onDelete();
                            // Collision Handling
                            const poly = polyShapeMap.current.get(id as TLShapeId);
                            if (!poly) continue;
                            collisionSystem.remove(poly);

                            cleanup(editor);
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