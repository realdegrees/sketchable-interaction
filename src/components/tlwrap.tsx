'use client'

import { usePluginStore } from "@/stores/plugin";
import { Tldraw, TLDrawShape, TLShape, TLUiOverrides } from "tldraw";
import Toolbar from "./toolbar";
import RectShapeUtil from "@/shapes/rect";
import { setTimeout } from "timers";
import { PluginDataSchema, PluginPropsSchema } from "@/plugins/base";
import { z } from "zod";
import { unwrapShape } from "@/util/pluginUtil";
import { RectShapeTool } from "./tools";
import { uiOverrides } from "./uiOverrides";

export const ShapeMetaSchema = z.object({
    props: PluginPropsSchema,
    data: PluginDataSchema
});
export type ShapeMeta = z.infer<typeof ShapeMetaSchema>;

const Tlwrap = () => {
    const {selected, plugins} = usePluginStore();

    return (
        <div className="fixed inset-0">
            <Tldraw
                shapeUtils={[RectShapeUtil]} // TODO Add toolbar buttons for shapes
                tools={[RectShapeTool]}
                overrides={uiOverrides}
                components={{
                    Toolbar
                    // TODO override color/shape component as well to remove several options
                }}
                onMount={(editor) => {
                    // ! This can be removed when not needed as reference anymore, plugin properties are now stored in the shapes properties directly
                    /*  Retrieve the current plugin and attach its ID as meta-data to every new shape
                        Also inform the plugin that a shape has been created
                        https://tldraw.dev/docs/shapes#Meta-information   */
                    editor.getInitialMetaForShape = (shape) => {
                        const { selected, getPlugin } = usePluginStore.getState();
                        const { plugin, properties } = getPlugin(selected) ?? {};

                        if (!plugin || !properties) {
                            console.warn('Unable to get current plugin info during shape creation!');
                            return {};
                        }


                        const meta: ShapeMeta = {
                            props: properties,
                            data: {}
                        };

                        console.log(`Creating shape with plugin: ${properties.id}`);
                        return meta;
                    }

                    /* https://tldraw.dev/examples/editor-api/store-events */
                    editor.store.listen(({ changes: { updated, removed, added } }) => {
                        // Updated
                        for (const [from, to] of Object.values(updated)) {
                            if (to.typeName === 'shape' && (to.type !== 'draw' || (to.type === 'draw' && (to as TLDrawShape).props.isComplete))) {
                                //console.log(to);
                            }
                        }
                        // Added
                        for (const { id, meta, typeName } of Object.values(added)) {
                            if (typeName !== 'shape') continue;
                            const shape = editor.getShape(id) as TLShape; // Cast because it can't be undefined when the added event is fired
                            const { plugin } = unwrapShape(shape) ?? {};
                            plugin?.onCreate(editor, shape);
                        }
                        // Removed
                        for (const { id, meta, typeName } of Object.values(removed)) {
                            if (typeName !== 'shape') continue;

                            const unwrappedShape = unwrapShape({ meta });

                            if (!unwrappedShape) {
                                console.warn(`Deleted shape did not have an associated plugin`);
                                return;
                            }


                            unwrappedShape.plugin.onDelete(unwrappedShape.data);

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

                                shapesinViewport.forEach((compareShape) => {
                                    if (shape === compareShape) return;

                                    const compareShapeBounds = editor.getShapePageBounds(compareShape);
                                    if (shapeBounds && compareShapeBounds?.collides(shapeBounds)) {
                                        // Unwrap compare shape
                                        const unwrappedCompareShape = unwrapShape(shape);
                                        if (!unwrappedCompareShape) {
                                            return;
                                        }

                                        // Let the plugin handle the collision
                                        unwrappedShape.plugin.onCollision(editor, {
                                            data: unwrappedShape.data,
                                            shape
                                        }, {
                                            data: unwrappedCompareShape.data,
                                            shape: compareShape
                                        }, 'user');

                                        // TODO if the shape has a conveyor belt plugin meta tag then give the colliding shape a corresponding meta tag that indicates it's currently being moved. These items can then be filtered in store events to reduce performance impact
                                    }
                                })
                            })
                        }
                    })
                }} />
        </div>
    )
}
export default Tlwrap;