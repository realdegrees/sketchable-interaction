'use client';

import PluginBar from "@/components/pluginbar";
import Toolbar from "@/components/toolbar";
import { usePluginStore } from "@/stores/plugin";
import { TLDrawShape, Tldraw } from "tldraw";

const Main = () => {
  return (
    <main className="w-full h-full">
      <div className="fixed inset-0">
        <Tldraw
          components={{
            Toolbar 
            // TODO override color/shape component as well to remove several options
          }}
          onMount={(editor) => { 
            
            // TODO do the same but for color, background etc. to set default behaviours for shapes depending the select plugin
            /*  Retrieve the current plugin and attach its ID as meta-data to every new shape
                https://tldraw.dev/docs/shapes#Meta-information   */
            editor.getInitialMetaForShape = () => ({
              plugin: usePluginStore.getState().selected
            });

            /* https://tldraw.dev/examples/editor-api/store-events */
            editor.store.listen(({ changes: { updated, removed } }) => {
              // Updated
              for (const [from, to] of Object.values(updated)) {
                if (to.typeName === 'shape' && (to.type !== 'draw' || (to.type === 'draw' && (to as TLDrawShape).props.isComplete))) {
                  //console.log(to);
                }
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
                  const shapeBounds = editor.getShapePageBounds(shape);
                  shapesinViewport.forEach((compareShape) => {
                    if(shape === compareShape) return;

                    const compareShapeBounds = editor.getShapePageBounds(compareShape);
                    if(shapeBounds && compareShapeBounds?.collides(shapeBounds)){
                      // TODO if the shape has a conveyor belt plugin meta tag then give the colliding shape a corresponding meta tag that indicates it's currently being moved. These items can then be filtered in store events to reduce performance impact
                      console.log(`Collision detected\n${shape.id}\n-> ${shape.meta['plugin']}\n${compareShape.id}\n-> ${compareShape.meta['plugin']}`);
                    }
                  })
                })
              }
            })
          }} />
      </div>
      <PluginBar />
    </main>
  );
}
export default Main;
