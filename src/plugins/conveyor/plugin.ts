import { Editor, TLArrowShape, TLShape, TLShapeId, Vec } from "tldraw";
import BasePlugin, { PluginData } from "../base";
import { unwrapShape } from "@/util/pluginUtil";

const SPEED = 4;
class Plugin extends BasePlugin {
  private disableBendListeners: Map<TLShapeId, () => void> = new Map();
  tick(editor: Editor): void {
    // TODO: move all connected shapes
    
    Array.from(this.connectedShapes.entries()).forEach(
      ([conveyorId, itemIds], i, arr) => {
        const conveyorShape = editor.getShape<TLArrowShape>(conveyorId);

        if (!conveyorShape) return;

        let destX = 0,
          destY = 0;

        if (conveyorShape.props.end.type === "point") {
          destX = conveyorShape.x + conveyorShape.props.end.x;
          destY = conveyorShape.y + conveyorShape.props.end.y;
        } else {
          const { x, y, props } =
            editor.getShape(conveyorShape.props.end.boundShapeId) ?? {};

          let w = 1,
            h = 1;

          if (props && "w" in props && "h" in props) {
            w = props.w as number;
            h = props.h as number;
          }

          const dest = Vec.Add(
            new Vec(x, y),
            new Vec(
              w * conveyorShape.props.end.normalizedAnchor.x,
              h * conveyorShape.props.end.normalizedAnchor.y
            )
          );
          destX = dest.x;
          destY = dest.y;
        }
        // const destinationX =
        //   conveyorShape.x +
        //   (conveyorShape.props.end.type === "point"
        //     ? conveyorShape.props.end.x
        //     : 0);
        // const destinationY =
        //   conveyorShape.y +
        //   (conveyorShape.props.end.type === "point"
        //     ? conveyorShape.props.end.y
        //     : 0);
        const destination = new Vec(destX, destY);
        const selectedShapes = editor.getSelectedShapeIds();
        itemIds
          .map((id) => editor.getShape(id))
          .filter((shape): shape is TLShape => !!shape)
          .filter((shape) => !selectedShapes.includes(shape.id))
          .forEach((shape) => {
            const { x, y, props } = shape;

            let offsetX = 0,
              offsetY = 0;
            if (
              "w" in props &&
              "h" in props &&
              !isNaN(props.w) &&
              !isNaN(props.h)
            ) {
              offsetX = props.w / 2;
              offsetY = props.h / 2;
            }

            const direction = Vec.Sub(
              new Vec(destination.x - offsetX, destination.y - offsetY),
              new Vec(x, y)
            );
            const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2);

            if (magnitude === 0) {
              return;
            }

            const normalized = Vec.Mul(Vec.Div(direction, magnitude), SPEED);
            const normalizedMagnitude = Math.sqrt(
              normalized.x ** 2 + normalized.y ** 2
            );

            const shapeOffset =
              normalizedMagnitude < magnitude ? normalized : direction;
            editor.updateShape({
              ...shape,
              x: x + shapeOffset.x,
              y: y + shapeOffset.y,
            });
          });
      }
    );
  }
  public onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      data?: PluginData;
    }
  ): void {
    const moveable = !!unwrapShape(colliding.shape)?.plugin.properties.moveable;
    if (!moveable) return;

    console.log(`${colliding.shape.id} entered conveyor ${self.shape.id}`);

    // Disconnect from any other conveyor belts
    Array.from(this.connectedShapes.entries()).forEach(([conveyorId, itemIds]) => {
      this.connectedShapes.set(
        conveyorId,
        itemIds.filter((id) => id !== colliding.shape.id)
      );
    });

    // check if colliding plugin is "moveable" and if yes add it to a map of current items on the conveyor belt (a map of shapeIds and current position)
    this.connectShape(self.shape.id, colliding.shape.id, editor);
  }
  public onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      data?: PluginData;
    }
  ): void {
    console.log(`${colliding.shape.id} left conveyor ${self.shape.id}`);

    this.disconnectShape(self.shape.id, colliding.shape.id, editor);
  }
  public onCreate(editor: Editor, shape: TLArrowShape): void {
    const unsubscribe = editor.store.listen(({ changes: { updated } }) => {
      for (const [to] of Object.values(updated) as [TLShape, TLShape][]) {
        if(to.id !== shape.id) continue;
        shape = editor.getShape(to.id) as TLArrowShape;

        if(shape.props.bend !== 0){
          // Disables the ability to bend conveyors
          editor.updateShape({
            ...shape,
            props: {
              ...shape.props,
              bend: 0,
            },
          });
        }
      }
    });
    this.disableBendListeners.set(shape.id, unsubscribe);
  }
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: PluginData): void {
    this.disableBendListeners.get(shapeId)?.();
    this.disableBendListeners.delete(shapeId);
  }
}

export default new Plugin({
  id: "conveyor",
  availableShapes: ["conveyor"],
  useableAsTool: true,
});
