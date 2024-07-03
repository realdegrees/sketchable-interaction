/* eslint-disable react-hooks/rules-of-hooks */ // ESLint thinks this is a class component but it's not according to tldraw documentation

import { unwrapShape } from "@/util/pluginUtil";
import Image from "next/image";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { TLBaseShape, TLDefaultColorStyle, Geometry2d, Rectangle2d, HTMLContainer, getDefaultColorTheme, BaseBoxShapeUtil } from "tldraw";

type Shape = TLBaseShape<
    'rect',
    {
        w: number,
        h: number,
        color: TLDefaultColorStyle,
    }
>

export default class RectShapeUtil extends BaseBoxShapeUtil<Shape> {
    static override type = 'rect' as const;

    getDefaultProps(): Shape['props'] {
        return {
            w: 200,
            h: 200,
            color: 'black'
        }
    }
    getGeometry(shape: Shape): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true,
        })
    }
    component(shape: Shape) {
        const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })

        const plugin = unwrapShape(shape);
        const fallback = plugin?.icon ? <Image src={plugin.icon} alt="logo" loading="lazy" /> : <p>{plugin?.properties.label ?? plugin?.properties.id ?? 'Unable to load icon or component'}</p>;
        // * Adjust style to filter which tldraw styling panel options are available
        // ? https://tldraw.dev/examples/shapes/tools/shape-with-tldraw-styles
        return (
            <HTMLContainer
                id={shape.id}
                className="border border-black relative"
                style={{
                    pointerEvents: 'all',
                    backgroundColor: theme[shape.props.color].semi,
                    color: theme[shape.props.color].solid,
                }}
            >
                <div className="w-full h-full flex flex-col justify-center items-center m-1/12  overflow-hidden max-h-full">
                    {/* Add custom component in the shape's context if it exists */}
                    {plugin?.Component ? < ErrorBoundary fallback={fallback} onError={() => (console.warn(`Unable to load custom component for ${plugin.properties.id}`))}>
                            <plugin.Component data={plugin.data} shape={shape} />
                    </ErrorBoundary> : fallback}
                </div>
                {
                    plugin?.Component && plugin.icon && <Image src={plugin.icon} alt="logo" className="absolute left-0 bottom-0 w-12 h-12" />
                }
            </HTMLContainer >
        )
    }
    indicator(shape: Shape) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }

}