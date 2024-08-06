/* eslint-disable react-hooks/rules-of-hooks */ // ESLint thinks this is a class component but it's not according to tldraw documentation

import { useHoverEvent } from "@/hooks/useHoverEvent";
import { unwrapShape } from "@/util/pluginUtil";
import Image from "next/image";
import { Suspense, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { TLBaseShape, TLDefaultColorStyle, Geometry2d, Rectangle2d, HTMLContainer, getDefaultColorTheme, BaseBoxShapeUtil, useEditor, ArrowShapeUtil, TLArrowShape } from "tldraw";


export default class RectShapeUtil extends ArrowShapeUtil {
    static override type = 'arrow' as const;

    getDefaultProps(): TLArrowShape["props"] {
        return {
            arrowheadEnd: 'pipe',
            arrowheadStart: 'dot',
            size: 'xl',
            dash: 'dashed',
            bend: 0.1,
            color: 'white',
            end: {type: 'point', x: 0, y: 0},
            start: {type: 'point', x: 0, y: 0},
            fill: 'pattern',
            font: 'draw',
            labelColor: 'white',
            labelPosition: 1,
            text: 'Conveyor Belt'
        }
    }

    component(shape: TLArrowShape) {
        const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })

        const { plugin, Component, icon, data } = unwrapShape(shape) ?? {};
        const editor = useEditor();

        // TODO change default arrow porperties like size and endings

        const fallback = icon ? <Image src={icon} alt="logo" loading="lazy" className="pointer-events-none w-2/3 h-2/3" /> : <p>{plugin?.properties.label ?? plugin?.properties.id ?? 'Unable to load icon or component'}</p>;
        // * Adjust style to filter which tldraw styling panel options are available
        // ? https://tldraw.dev/examples/shapes/tools/shape-with-tldraw-styles
        return (
            <HTMLContainer
                id={shape.id}
                className="border relative"
                style={{
                    pointerEvents: 'all',
                    backgroundColor: plugin?.properties.onlyCustomComponent ? 'transparent' : theme[shape.props.color].semi,
                    border: plugin?.properties.onlyCustomComponent ? 'none' : undefined,
                    color: theme[shape.props.color].solid,
                }}
            >
                <div className="w-full h-full flex flex-col justify-center items-center">
                    {/* Add custom component in the shape's context if it exists */}
                    {Component ? < ErrorBoundary fallback={fallback} onError={() => (console.warn(`Unable to load custom component for ${plugin?.properties.id}`))}>
                        <Component data={data} shape={shape} />
                    </ErrorBoundary> : fallback}
                </div>
                {
                    Component && icon && <Image src={icon} alt="logo" className="absolute left-0 -bottom-12 w-12 h-12 pointer-events-none" />
                }
            </HTMLContainer >
        )
    }
}