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

type Poly = VecModel[];

export const getShapeCoordinates = (
  shape: TLShape,
  editor: Editor
): { origin: VecModel; coords: Poly } => {
  if (shape.type === "arrow")
    return getArrowCoordinates(shape as TLArrowShape, editor);
  else return getRectCoordinates(shape as TLGeoShape);
};
export const getArrowCoordinates = (
  shape: TLArrowShape,
  editor: Editor
): { origin: VecModel; coords: Poly } => {
  let start: VecModel, end: VecModel;
  if (shape.props.start.type === "point") {
    start = {
      x: shape.x,
      y: shape.y,
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
      x: shape.props.end.x, // * 2,
      y: shape.props.end.y, // * 2,
    };
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
      start
    );

    end = arrowEnd;
  }
  return {
    origin: { x: start.x, y: start.y },
    coords: [{ x: 0, y: 0 }, end],
  };
};

export const getRectCoordinates = (
  shape: TLShape & { props: { w: number; h: number } }
): { origin: VecModel; coords: Poly } => {
  const rotationCos = Math.cos(shape.rotation);
  const rotationSin = Math.sin(shape.rotation);

  const rotatePoint = (x: number, y: number) => {
    // Translate point to origin
    const translatedX = x;
    const translatedY = y;

    // Apply rotation
    const rotatedX = translatedX * rotationCos - translatedY * rotationSin;
    const rotatedY = translatedX * rotationSin + translatedY * rotationCos;

    // Translate back to original position
    return {
      x: rotatedX,
      y: rotatedY,
    };
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
    origin: { x: shape.x, y: shape.y },
    coords: poly,
  };
};