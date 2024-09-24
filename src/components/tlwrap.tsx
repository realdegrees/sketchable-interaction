'use client'

import { usePluginStore } from "@/stores/plugin";
import { Editor, JsonObject, TLArrowShape, Tldraw, TLRecord, TLShape, TLShapeId } from "tldraw";
import Toolbar from "./toolbar";
import RectShapeUtil from "@/custom-shapes/rect/shapeUtil";
import ConveyorShapeUtil from "@/custom-shapes/conveyor/shapeUtil";
import RectShapeTool from "@/custom-shapes/rect/tool";
import ConveyorShapeTool from "@/custom-shapes/conveyor/tool";
import BasePlugin from "../../plugins/base";
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
    const { eventEmitter: pluginStoreEventEmitter } = usePluginStore();
    const [collisionSystem, setCollisionSystem] = useState(new System());



    const updateCollision = async (editor: Editor, shape: Partial<TLShape> & { id: TLShapeId, meta: JsonObject }) => {
        const { plugin, data } = PluginUtil.unwrapShape(shape) ?? {};
        if (!plugin) return;
        const collisionMap = collisionTable.current.get(shape.id);




        const cachedShapeCollisions = Array.from((collisionTable.current.get(shape.id))?.values() ?? []);
        collisionMap?.clear();

        // Shape was deleted so collisionend is called for all colliding shapes and the shape is removed from the collision table
        // No further action required so return
        if (plugin.destroyed) {
            cachedShapeCollisions
                .map((id) => editor.getShape(id))
                .map((shape) => PluginUtil.unwrapShape(shape))
                .forEach((unwrappedShape) => {
                    const cachedCollisionPlugin = unwrappedShape?.plugin;
                    const cachedCollisionData = unwrappedShape?.data;

                    cachedCollisionPlugin && cachedCollisionPlugin?.onCollisionEnd(cachedCollisionData, {
                        plugin,
                        shape,
                        data
                    })
                });
            collisionTable.current.delete(shape.id);
            collisionTable.current.forEach((collisionMap) => collisionMap.delete(shape.id));
            return;
        }



        // Update Collision Stats Handling
        const poly = polyShapeMap.current.get(shape.id);
        const { origin, coords } = getShapeCoordinates(shape, editor) ?? {};
        origin && poly?.setPosition(origin.x, origin.y);
        coords && poly?.setPoints(coords.map(({ x, y }) => new SATVector(x, y)));

        poly && collisionSystem.checkOne(poly, (response) => {
            const collidingId = Array.from(polyShapeMap.current.entries()).find(([, poly]) => poly === response.b)?.[0];
            collidingId && (collisionMap?.add(collidingId) ?? collisionTable.current.set(shape.id, new Set([collidingId])));
        });

        const currentShapeCollisions = Array.from(collisionTable.current.get(shape.id)?.values() ?? []);
        const endedCollisions = cachedShapeCollisions.filter((endedCollisionShape) => !currentShapeCollisions.includes(endedCollisionShape));
        const startedCollisions = currentShapeCollisions.filter((endedCollisionShape) => !cachedShapeCollisions.includes(endedCollisionShape));



        // Handle started collisions
        for (const startedCollision of startedCollisions) {
            const compareShape = editor.getShape(startedCollision);
            if (!compareShape) continue;

            const compareShapePluginStore = PluginUtil.unwrapShape(compareShape);
            if (!compareShapePluginStore?.plugin) continue;

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
                    shape: shape as TLShape,
                }
            );

        }
        // Handle ended collisions
        for (const endedCollision of endedCollisions) {
            // Remove the collisionId from own table entry and other references
            collisionTable.current.get(endedCollision)?.delete(shape.id);
            collisionTable.current.get(shape.id)?.delete(endedCollision);

            const compareShape = editor.getShape(endedCollision);
            if (!compareShape) return;

            const compareShapePluginStore = PluginUtil.unwrapShape(compareShape);
            if (!compareShapePluginStore?.plugin) return;

            // Send events to both of them
            await plugin.onCollisionEnd(
                data,
                {
                    data: compareShapePluginStore.data,
                    plugin: compareShapePluginStore.plugin,
                    shape: compareShape,
                }
            );

            await compareShapePluginStore.plugin.onCollisionEnd(
                data,
                {
                    data: data,
                    plugin: plugin,
                    shape: shape,
                }
            );
        }
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

    const initCollision = (editor: Editor, shape: TLShape): void => {
        // Collision Handling
        const { origin, coords } = getShapeCoordinates(shape, editor) ?? {};
        origin && coords && polyShapeMap.current.set(shape.id, collisionSystem.createPolygon(origin, coords));
        updateCollision(editor, shape);
    }

    return (
        <div className="fixed inset-0" ref={wrapperElRef}>

            <Tldraw
                inferDarkMode
                shapeUtils={[RectShapeUtil, ConveyorShapeUtil]}
                tools={[RectShapeTool, ConveyorShapeTool]}
                overrides={overrides}
                //persistenceKey="si"
                components={{
                    Toolbar
                }}

                onMount={(editor) => {
                    onTldrawMount(); // Sets darkmode refs
                    PluginUtil.setEditor(editor);

                    pluginStoreEventEmitter.on('ready', () => {
                        editor.getCurrentPageShapes().forEach((shape) => {
                            const plugin = PluginUtil.getPlugin(shape.id);
                            if (!plugin) return;

                            plugin.setEditor(editor);
                            initCollision(editor, shape);
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

                    // https://tldraw.dev/examples/editor-api/prevent-shape-change
                    // This is used to prevent conveyor bends and snaps
                    editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
                        if (editor.isShapeOfType<TLArrowShape>(prev, 'arrow') &&
                            editor.isShapeOfType<TLArrowShape>(next, 'arrow')) {
                            if (next.isLocked) return next;
                            if (next.props.start.type !== 'binding') return next;
                            const isPrecise = next.props.start.isPrecise;
                            if (!isPrecise) { return prev }

                            const isBent = next.props.bend > 0;
                            if (isBent) return prev;
                        }
                        return next;
                    })
                    /* https://tldraw.dev/examples/editor-api/store-events */
                    editor.store.listen(({ changes: { updated, removed, added } }) => {

                        // Sort event values to prioritize selected shapes
                        const selectedShapes = editor.getSelectedShapes().map(({ id }) => id);
                        const sortedUpdate = Object.values(updated).filter(([, to]) => to.typeName === 'shape').sort(([{ id }]) => selectedShapes.includes(id as TLShapeId) ? 1 : -1);
                        const sortedRemoved = Object.values(removed).filter((r): r is TLRecord => r.typeName === 'shape').sort(({ id }) => selectedShapes.includes(id as TLShapeId) ? 1 : -1);
                        const sortedAdded = Object.values(added).filter((a): a is TLShape => a.typeName === 'shape').sort(({ id }) => selectedShapes.includes(id as TLShapeId) ? 1 : -1);

                        // ! Updated
                        for (const [prev, shape] of (sortedUpdate as [TLShape, TLShape][])) {
                            const plugin = PluginUtil.getPlugin(shape.id);
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
                            plugin.onShapeUpdate(shape);
                            editor.bringToFront([shape.id]);
                            initCollision(editor, shape);
                        }
                        // ! Removed
                        for (const { id, meta } of sortedRemoved) {
                            // Remove instance reference in pluginStore, send onDelete event, let plugin get garbage collected
                            const plugin = PluginUtil.getPlugin(id as TLShapeId);
                            if (!plugin) continue;
                            plugin.destroyed = true;
                            // Collision Handling
                            const poly = polyShapeMap.current.get(id as TLShapeId);
                            if (!poly) continue;
                            collisionSystem.remove(poly);
                            updateCollision(editor, { id: id as TLShapeId, meta });
                            cleanup(editor);
                            plugin.onDelete();
                            usePluginStore.getState().unregisterInstance(id as TLShapeId);
                        }
                    })
                }} />
        </div>
    )
}
export default Tlwrap;