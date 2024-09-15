import { Editor, TLArrowShape, TLShape, Vec } from "tldraw";
import BasePlugin, { PluginConfig } from "../base";
import { PluginUtil } from "@/util/pluginUtil";
import { getArrowCoordinates } from "@/util/collision";
import { ConveyorData } from "./config";
import { usePluginStore } from "@/stores/plugin";

const SPEED = 8;
export default class ConveyorPlugin extends BasePlugin<ConveyorData, TLArrowShape> {
  private unsubTick: (() => void) | undefined;
  constructor(props: PluginConfig, shape: TLArrowShape, editor: Editor) {
    super(props, shape, editor);
    this.unsubTick = this.moveConnectedShapes.bind(this);
    this.on("tick", this.unsubTick);
  }

  public override onShapeUpdate(shape: TLArrowShape) {
    if (shape.props.bend !== 0) {
      // Disables the ability to bend conveyors
      this.editor!.updateShape({
        ...shape,
        props: {
          ...shape.props,
          bend: 0,
        },
      });
    }
    super.onShapeUpdate(shape);
  }

  private getClosesPointOnLine(start: Vec, end: Vec, point: Vec): Vec {
    const lineVec = Vec.Sub(end, start);
    const pointVec = Vec.Sub(point, start);

    const dotProduct = lineVec.x * pointVec.x + lineVec.y * pointVec.y;
    const lineLengthSquared = lineVec.x * lineVec.x + lineVec.y * lineVec.y;

    const t = dotProduct / lineLengthSquared;
    const clampedT = Math.max(0, Math.min(1, t));

    const closestPoint = new Vec(
      start.x + clampedT * lineVec.x,
      start.y + clampedT * lineVec.y
    );
    // Return projected point
    return closestPoint;
  }

  private getDistance(pointA: Vec, pointB: Vec): number {
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private moveConnectedShapes(): void {
    if (!this.editor) return;

    const {
      origin,
      coords: [start, end],
    } = getArrowCoordinates(this.shape, this.editor);

    const destination = Vec.Add(origin, end);
    const source = Vec.Add(origin, start);
    const selectedShapes = this.editor.getSelectedShapeIds();

    this.connectedShapes.forEach((shapeId) => {
      if (!this.editor) return;
      if (selectedShapes.includes(shapeId)) return;
      this.editor.bringToFront([shapeId]); // Bring shapes moving on a coneyor forward
      const shape = this.editor.getShape(shapeId);

      if (!shape) {
        this.disconnectShape(shapeId);
        return;
      }

      const { x, y, props } = shape;

      const offset = new Vec();
      if ("w" in props && "h" in props && !isNaN(props.w) && !isNaN(props.h)) {
        offset.x = props.w / 2;
        offset.y = props.h / 2;
      }

      const shapeCenter = Vec.Add(offset, new Vec(x, y));
      const closestPointOnLine = this.getClosesPointOnLine(
        source,
        destination,
        shapeCenter
      );
      const distanceToLine = this.getDistance(shapeCenter, closestPointOnLine);
      const distanceToDestination = this.getDistance(shapeCenter, destination);
      const target = distanceToLine > SPEED ? closestPointOnLine : destination;
      const speed = distanceToLine > SPEED * 4 ? SPEED * 4 : SPEED;

      if (distanceToDestination <= SPEED) {
        console.debug("Destination reached, disonnecting " + shapeId);
        this.disconnectShape(shapeId);
        return;
      }

      const direction = Vec.Sub(Vec.Sub(target, offset), new Vec(x, y));
      const magnitude = Math.sqrt(
        direction.x * direction.x + direction.y * direction.y
      );
      const normalized = Vec.Div(direction, magnitude);
      const speedVector = Vec.Mul(normalized, speed);

      this.editor.updateShape({
        ...shape,
        x: x + speedVector.x,
        y: y + speedVector.y,
      });
    });
  }
  public async onCollisionStart(
    data: ConveyorData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin<unknown>;
      data?: unknown;
    }
  ): Promise<void> {
    const moveable = colliding.plugin.config.moveable;
    if (!moveable) return;

    // Disconnect from any other conveyor belts
    usePluginStore
      .getState()
      .getPlugins(this.config.id)
      ?.forEach(({ plugin }) => plugin?.disconnectShape(colliding.shape.id));

    this.connectShape(colliding.shape.id);
  }
  public async onCollisionEnd(
    data: ConveyorData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin<unknown>;
      data?: unknown;
    }
  ): Promise<void> {
    this.disconnectShape(colliding.shape.id);
  }

  public onDelete(): void {
    this.unsubTick?.();
  }
}
