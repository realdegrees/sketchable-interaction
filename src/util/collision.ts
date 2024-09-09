import { PluginData } from "@/plugins/base";
import { PluginStore } from "@/stores/plugin";
import {
  TLArrowShape,
  VecModel,
  TLGeoShape,
  TLShape,
  Editor,
  TLShapeId,
  Vec,
} from "tldraw";
import { unwrapShape } from "./pluginUtil";

const getArrowCoordinates = (shape: TLArrowShape, editor: Editor): Poly => {
  let start: VecModel, end: VecModel;
  if (shape.props.start.type === "point") {
    start = {
      x: shape.props.start.x,
      y: shape.props.start.y,
    };
  } else {
    const { x, y, props } =
      editor.getShape(shape.props.start.boundShapeId) ?? {};

    let w = 1,
      h = 1;

    if (props && "w" in props && "h" in props) {
      w = props.w as number;
      h = props.h as number;
    }

    const arrowStart = Vec.Add(
      new Vec(x, y),
      new Vec(
        w * shape.props.start.normalizedAnchor.x,
        h * shape.props.start.normalizedAnchor.y
      )
    );
    start = arrowStart;
  }
  if (shape.props.end.type === "point") {
    end = {
      x: shape.props.end.x,
      y: shape.props.end.y,
    };
  } else {
    const { x, y, props } = editor.getShape(shape.props.end.boundShapeId) ?? {};

    let w = 1,
      h = 1;

    if (props && "w" in props && "h" in props) {
      w = props.w as number;
      h = props.h as number;
    }

    const arrowEnd = Vec.Add(
      new Vec(x, y),
      new Vec(
        w * shape.props.end.normalizedAnchor.x,
        h * shape.props.end.normalizedAnchor.y
      )
    );
    end = arrowEnd;
  }
  return [start, end];
};
type Poly = VecModel[];

const getRectCoordinates = (
  shape: TLShape & { props: { w: number; h: number } }
): Poly => {
  const centerX = shape.x + shape.props.w / 2;
  const centerY = shape.y + shape.props.h / 2;

  const halfWidth = shape.props.w / 2;
  const halfHeight = shape.props.h / 2;
  const rotationCos = Math.cos(shape.rotation);
  const rotationSin = Math.sin(shape.rotation);

  const rotatePoint = (x: number, y: number) => {
    // Translate point to origin
    const translatedX = x - centerX;
    const translatedY = y - centerY;

    // Apply rotation
    const rotatedX = translatedX * rotationCos - translatedY * rotationSin;
    const rotatedY = translatedX * rotationSin + translatedY * rotationCos;

    // Translate back to original position
    return {
      x: rotatedX + centerX,
      y: rotatedY + centerY,
    };
  };

  const poly: Poly = [];

  // Define the four corners relative to center
  const corners = [
    { x: centerX - halfWidth, y: centerY - halfHeight }, // top-left
    { x: centerX + halfWidth, y: centerY - halfHeight }, // top-right
    { x: centerX - halfWidth, y: centerY + halfHeight }, // bottom-left
    { x: centerX + halfWidth, y: centerY + halfHeight }, // bottom-right
  ];

  // Rotate each corner point around the center
  corners.forEach((corner) => {
    const rotatedPoint = rotatePoint(corner.x, corner.y);
    poly.push(rotatedPoint);
  });

  return poly;
};
const detectCollision = (
  shape: TLShape,
  compareShape: TLShape,
  editor: Editor
): boolean => {
  let polyA: Poly, polyB: Poly;
  switch (shape.type) {
    case "arrow": {
      polyA = getArrowCoordinates(shape as TLArrowShape, editor);
      break;
    }
    default: {
      if (!("w" in shape.props) || !("h" in shape.props)) {
        const shapeBounds = editor.getShapePageBounds(shape);
        if (!shapeBounds) return false;
        polyA = shapeBounds.corners;
      } else {
        polyA = getRectCoordinates(shape as TLGeoShape);
      }
    }
  }
  switch (compareShape.type) {
    case "arrow": {
      polyB = getArrowCoordinates(compareShape as TLArrowShape, editor);
      break;
    }
    default: {
      if (!("w" in compareShape.props) || !("h" in compareShape.props)) {
        const compareShapeBounds = editor.getShapePageBounds(compareShape);
        if (!compareShapeBounds) return false;
        polyB = compareShapeBounds.corners;
      } else {
        polyB = getRectCoordinates(compareShape as TLGeoShape);
      }
    }
  }

  const getEdges = (poly: Poly) => {
    const edges = [];
    for (let i = 0; i < poly.length; i++) {
      const nextIndex = (i + 1) % poly.length;
      const edge = {
        x: poly[nextIndex].x - poly[i].x,
        y: poly[nextIndex].y - poly[i].y,
      };
      edges.push(edge);
    }
    return edges;
  };

  const dotProduct = (a: VecModel, b: VecModel) => a.x * b.x + a.y * b.y;

  type Projection = { min: number; max: number };
  const projectPolygon = (poly: Poly, axis: VecModel): Projection => {
    let min = dotProduct(poly[0], axis);
    let max = min;

    for (let i = 1; i < poly.length; i++) {
      const projection = dotProduct(poly[i], axis);
      if (projection < min) min = projection;
      if (projection > max) max = projection;
    }
    return { min, max };
  };

  const overlap = (projectionA: Projection, projectionB: Projection) =>
    projectionA.min <= projectionB.max && projectionB.min <= projectionA.max;

  const normalize = (v: VecModel): VecModel => {
    const length = Math.sqrt(v.x * v.x + v.y * v.y);
    return { x: v.x / length, y: v.y / length };
  };

  const edgesA = getEdges(polyA);
  const edgesB = getEdges(polyB);

  // This adjusts the edges for arrows because they only have 2 points and need an axis along these
  if (polyA.length === 2) {
    const arrowEdge = {
      x: polyA[1].x - polyA[0].x,
      y: polyA[1].y - polyA[0].y,
    };
    edgesA.push(arrowEdge);
  }
  if (polyB.length === 2) {
    const arrowEdge = {
      x: polyB[1].x - polyB[0].x,
      y: polyB[1].y - polyB[0].y,
    };
    edgesB.push(arrowEdge);
  }

  for (const edge of edgesA) {
    const axis = normalize({ x: -edge.y, y: edge.x });
    const projectionA = projectPolygon(polyA, axis);
    const projectionB = projectPolygon(polyB, axis);

    if (!overlap(projectionA, projectionB)) {
      return false; // Separating axis found, no collision
    }
  }

  for (const edge of edgesB) {
    const axis = normalize({ x: -edge.y, y: edge.x });
    const projectionA = projectPolygon(polyA, axis);
    const projectionB = projectPolygon(polyB, axis);

    if (!overlap(projectionA, projectionB)) {
      return false; // Separating axis found, no collision
    }
  }

  return true; // No separating axis found, collision detected
};

export const handleCollision = (
  editor: Editor,
  compareShape: TLShape,
  collisionTable: Map<TLShapeId, Set<TLShapeId>>
) => {
  // Unwrap shape
  const compareShapePluginStore = unwrapShape(compareShape);
  if (!compareShapePluginStore) return;

  // Retrieve all shapes from the current page (filter those without plugins)
  const allShapes: [
    TLShape,
    (
      | (PluginStore & {
          data?: PluginData;
        })
      | undefined
    )
  ][] = editor
    .getCurrentPageShapesSorted()
    .map((shape) => [shape, unwrapShape(shape)])
    .filter(
      (
        f
      ): f is [
        TLShape,
        PluginStore & {
          data?: PluginData;
        }
      ] => !!f[1]
    );

  const collisionsWithCompareShape =
    collisionTable.get(compareShape.id) ?? new Set<TLShapeId>();
  // ! find a way to reduce the complexity of this operation, find literature on runtime complexity in collision detection
  // ? Found a way by only checking collision for shapes that were updated, complexity is O(x*n) where x = number of updated shapes and n is all shapes

  // Iterate all shapes and check if they collide with the compareShape
  allShapes.forEach(([shape, shapePluginStore]) => {
    if (shape.id === compareShape.id) return;

    // Unwrap shape
    if (!shapePluginStore) return;

    const collisionsWithShape =
      collisionTable.get(shape.id) ?? new Set<TLShapeId>();

    const isColliding = detectCollision(shape, compareShape, editor);
    const wasColliding =
      collisionsWithCompareShape.has(shape.id) ||
      collisionsWithShape.has(compareShape.id);

    // Don't do anything if the shapes were already colliding and still are colliding
    if (wasColliding && isColliding) return;
    // Same if they were not colliding and still don't
    if (!wasColliding && !isColliding) return;

    if (!wasColliding && isColliding) {
      // Collision started, add collision to table and fire events
      collisionsWithCompareShape.add(shape.id);
      collisionsWithShape.add(compareShape.id);
      console.log("collision");

      compareShapePluginStore.plugin.onCollisionStart(
        editor,
        {
          data: compareShapePluginStore.data,
          shape: compareShape,
        },
        {
          data: shapePluginStore.data,
          plugin: shapePluginStore.plugin,
          shape: shape,
        }
      );

      shapePluginStore.plugin.onCollisionStart(
        editor,
        {
          data: shapePluginStore.data,
          shape: shape,
        },
        {
          data: compareShapePluginStore.data,
          plugin: compareShapePluginStore.plugin,
          shape: compareShape,
        }
      );
    } else if (wasColliding && !isColliding) {
      // Collision stopped, remove collision from table and fire events
      collisionsWithCompareShape.delete(shape.id);
      collisionsWithShape.delete(compareShape.id);

      compareShapePluginStore.plugin.onCollisionEnd(
        editor,
        {
          data: compareShapePluginStore.data,
          shape: compareShape,
        },
        {
          data: shapePluginStore.data,
          plugin: shapePluginStore.plugin,
          shape: shape,
        }
      );

      shapePluginStore.plugin.onCollisionEnd(
        editor,
        {
          data: shapePluginStore.data,
          shape: shape,
        },
        {
          data: compareShapePluginStore.data,
          plugin: compareShapePluginStore.plugin,
          shape: compareShape,
        }
      );
    }

    // Updates the collisiontable
    collisionTable.set(shape.id, collisionsWithShape);
    collisionTable.set(compareShape.id, collisionsWithCompareShape);
  });
};
