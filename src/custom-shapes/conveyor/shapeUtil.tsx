/* eslint-disable react-hooks/rules-of-hooks */ // ESLint thinks this is a class component but it's not according to tldraw documentation

// TODO MIGHT NOT HAVE TO USE CUSTOM SHAPE, COULD JUST USE DEFAULT ARROW

import { unwrapShape } from "@/util/pluginUtil";
import Image from "next/image";
import { ErrorBoundary } from "react-error-boundary";
import { Geometry2d, HTMLContainer, getDefaultColorTheme, useEditor, TLArrowShape, TLOnBeforeCreateHandler, ShapeUtil, TLBaseShape, Rectangle2d, ArrowShapeUtil, TLArrowShapeProps, VecModel, Group2d, } from "tldraw";

// ? Syntax and structure reference https://gist.github.com/mdroidian/55927b143bbf8ed19ba730e49a76194b


type CustomArrowShape = TLBaseShape<
    'conveyor',
    {
        inverse: boolean
    } & TLArrowShapeProps
>


export default class ConveyorShapeUtil extends ShapeUtil<CustomArrowShape> {
    getGeometry(shape: CustomArrowShape): Geometry2d {
        throw new Error("Method not implemented.");
    }
    indicator(shape: CustomArrowShape) {
        throw new Error("Method not implemented.");
    }

    static override type = 'conveyor' as const;

    getDefaultProps(): CustomArrowShape["props"] {
        throw new Error("Method not implemented.");

    }


    component(shape: CustomArrowShape) {

        return <HTMLContainer style={{  }}/>
    }
}