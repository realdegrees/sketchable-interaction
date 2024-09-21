import {
  TLArrowShape,
  VecModel,
  TLGeoShape,
  TLShape,
  Editor,
  Vec,
  TLShapeId,
  JsonObject,
} from "tldraw";

type Poly = Vec[];

export const getShapeCoordinates = (
  shape: Partial<TLShape> & { id: TLShapeId; meta: JsonObject },
  editor: Editor
): { origin: Vec; coords: Poly } | undefined => {
  if (shape.type === "arrow") {
    return getArrowCoordinates(shape as TLArrowShape, editor);
  } else {
    return getRectCoordinates(shape);
  }
};
export const getArrowCoordinates = (
  shape: TLArrowShape,
  editor: Editor
): { origin: Vec; coords: Poly } => {
  const origin = new Vec(shape.x, shape.y);
  let start: Vec = new Vec(),
    end: Vec = new Vec();
  if (shape.props.start.type === "point") {
    start.x = shape.props.start.x;
    start.y = shape.props.start.y;
  } else {
    const { x, y, props } =
      editor.getShape(shape.props.start.boundShapeId) ?? {};

    let w = 1,
      h = 1;

    if (props && "w" in props && "h" in props) {
      w = props.w as number;
      h = props.h as number;
    }

    const arrowStart = Vec.Sub(
      Vec.Add(
        new Vec(x, y),
        new Vec(
          w * shape.props.start.normalizedAnchor.x,
          h * shape.props.start.normalizedAnchor.y
        )
      ),
      origin
    );
    start = arrowStart;
  }
  if (shape.props.end.type === "point") {
    end.x = shape.props.end.x; // * 2,
    end.y = shape.props.end.y; // * 2,
  } else {
    const { x, y, props } = editor.getShape(shape.props.end.boundShapeId) ?? {};

    let w = 1,
      h = 1;

    if (props && "w" in props && "h" in props) {
      w = props.w as number;
      h = props.h as number;
    }

    let arrowEnd = Vec.Sub(
      Vec.Add(
        new Vec(x, y),
        new Vec(
          w * shape.props.end.normalizedAnchor.x,
          h * shape.props.end.normalizedAnchor.y
        )
      ),
      origin
    );

    end = arrowEnd;
  }

  return {
    origin,
    coords: [start, end],
  };
};

export const getRectCoordinates = (
  shape: Partial<TLShape> & { id: TLShapeId, meta: JsonObject }
): { origin: Vec; coords: Poly } | undefined => {
  if(typeof shape.rotation === 'undefined' || !shape.props || !('w' in shape.props) || !('h' in shape.props)) return;
  const rotationCos = Math.cos(shape.rotation);
  const rotationSin = Math.sin(shape.rotation);

  const rotatePoint = (x: number, y: number): Vec => {
    // Translate point to origin
    const translatedX = x;
    const translatedY = y;

    // Apply rotation
    const rotatedX = translatedX * rotationCos - translatedY * rotationSin;
    const rotatedY = translatedX * rotationSin + translatedY * rotationCos;

    // Translate back to original position
    return new Vec(rotatedX, rotatedY);
  };

  // Define the four corners relative to center
  const corners = [
    { x: 0, y: 0 }, // top-left
    { x: shape.props.w, y: 0 }, // top-right
    { x: 0, y: shape.props.h }, // bottom-left
    { x: shape.props.w, y: shape.props.h }, // bottom-right
  ];

  // Rotate each corner point around the center
  const poly: Poly = corners.map((corner) => {
    return rotatePoint(corner.x, corner.y);
  });

  return {
    origin: new Vec(shape.x, shape.y),
    coords: poly,
  };
};
