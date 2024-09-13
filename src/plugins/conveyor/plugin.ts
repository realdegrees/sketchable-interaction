import {
  Editor,
  TLArrowShape,
  TLShape,
  TLShapeId,
  Vec,
  VecModel,
} from "tldraw";
import BasePlugin, { PluginProps } from "../base";
import { unwrapShape } from "@/util/pluginUtil";
import { z } from "zod";
import { getArrowCoordinates } from "@/util/collision";
import { normalize } from "path";

const ConveyorDataSchema = z.object({});
export type ConveyorData = z.infer<typeof ConveyorDataSchema>;

const SPEED = 8;
class Plugin extends BasePlugin<ConveyorData> {
  private disableBendListeners: Map<TLShapeId, () => void> = new Map();

  constructor(props: PluginProps) {
    super(props);

    super.tick(this.handleConnectedConveyors.bind(this));
  }
  private handleConnectedConveyors(editor?: Editor): void {
    if (!editor) {
      console.warn("Conveyor tick not working");
      return;
    }
    Array.from(this.connectedShapes.entries()).forEach(
      ([conveyorId, itemIds]) => {
        const conveyorShape = editor.getShape<TLArrowShape>(conveyorId);
        if (!conveyorShape) return;
        const {
          origin,
          coords: [start, end],
        } = getArrowCoordinates(conveyorShape, editor);
        const destination = Vec.Add(origin, end);
        const source = Vec.Add(origin, start);

        const getClosesPointOnLine = (
          start: Vec,
          end: Vec,
          point: Vec
        ): Vec => {
          const lineVec = Vec.Sub(end, start);
          const pointVec = Vec.Sub(point, start);

          const dotProduct = lineVec.x * pointVec.x + lineVec.y * pointVec.y;
          const lineLengthSquared =
            lineVec.x * lineVec.x + lineVec.y * lineVec.y;

          const t = dotProduct / lineLengthSquared;
          const clampedT = Math.max(0, Math.min(1, t));

          const closestPoint = new Vec(
            source.x + clampedT * lineVec.x,
            source.y + clampedT * lineVec.y
          );
          // Return projected point
          return closestPoint;
        };

        const getDistance = (pointA: Vec, pointB: Vec): number => {
          const dx = pointB.x - pointA.x;
          const dy = pointB.y - pointA.y;
          return Math.sqrt(dx * dx + dy * dy);
        };

        const selectedShapes = editor.getSelectedShapeIds();

        const shapesToMove = itemIds
          .map((id) => editor.getShape(id))
          .filter((shape): shape is TLShape => !!shape)
          .filter((shape) => !selectedShapes.includes(shape.id));

        editor.bringToFront(shapesToMove); // Bring shapes moving on a coneyor forward

        for (const shape of shapesToMove) {
          const { x, y, props } = shape;

          const offset = new Vec();
          if (
            "w" in props &&
            "h" in props &&
            !isNaN(props.w) &&
            !isNaN(props.h)
          ) {
            offset.x = props.w / 2;
            offset.y = props.h / 2;
          }

          const shapeCenter = Vec.Add(offset, new Vec(shape.x, shape.y));
          const closestPointOnLine = getClosesPointOnLine(
            source,
            destination,
            shapeCenter
          );
          const distanceToLine = getDistance(shapeCenter, closestPointOnLine);
          const distanceToDestination = getDistance(shapeCenter, destination);
          const target =
            distanceToLine > SPEED ? closestPointOnLine : destination;
          const speed =
            distanceToLine > SPEED * 4 ? SPEED * 4 : SPEED;

          if (distanceToDestination <= SPEED) {
            console.debug("Destination reached, disonnecting " + shape.id);
            this.disconnectShape(conveyorShape.id, shape.id, editor);
            return;
          }

          const direction = Vec.Sub(Vec.Sub(target, offset), new Vec(x, y));
          const magnitude = Math.sqrt(
            direction.x * direction.x + direction.y * direction.y
          );
          const normalized = Vec.Div(direction, magnitude);
          const speedVector = Vec.Mul(normalized, speed);

          editor.updateShape({
            ...shape,
            x: x + speedVector.x,
            y: y + speedVector.y,
          });
        }
      }
    );
  }
  public async onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: ConveyorData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin<unknown>;
      data?: unknown;
    }
  ): Promise<void> {
    const moveable = !!unwrapShape(colliding.shape)?.plugin.properties.moveable;
    if (!moveable) return;
    // Disconnect from any other conveyor belts
    Array.from(this.connectedShapes.entries()).forEach(
      ([conveyorId, itemIds]) => {
        this.connectedShapes.set(
          conveyorId,
          itemIds.filter((id) => id !== colliding.shape.id)
        );
      }
    );

    editor.animateShape(colliding.shape);
    // check if colliding plugin is "moveable" and if yes add it to a map of current items on the conveyor belt (a map of shapeIds and current position)
    this.connectShape(self.shape.id, colliding.shape.id, editor);
  }
  public async onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: ConveyorData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin<unknown>;
      data?: unknown;
    }
  ): Promise<void> {
    this.disconnectShape(self.shape.id, colliding.shape.id, editor);
  }
  public onCreate(editor: Editor, shape: TLArrowShape): void {
    const unsubscribe = editor.store.listen(({ changes: { updated } }) => {
      for (const [to] of Object.values(updated) as [TLShape, TLShape][]) {
        if (to.id !== shape.id) continue;
        shape = editor.getShape(to.id) as TLArrowShape;

        if (shape.props.bend !== 0) {
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
  public onDelete(
    editor: Editor,
    shapeId: TLShapeId,
    data?: ConveyorData
  ): void {
    this.disableBendListeners.get(shapeId)?.();
    this.disableBendListeners.delete(shapeId);
  }
}

export default new Plugin({
  id: "conveyor",
  availableShapes: ["conveyor"],
  useableAsTool: true,
  pluginDataSchema: ConveyorDataSchema,
  tickRate: 20,
});
