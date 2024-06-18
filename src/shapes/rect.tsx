/* eslint-disable react-hooks/rules-of-hooks */ // ESLint thinks this is a class component but it's not according to tldraw documentation

import { PluginProps } from "@/plugins/base";
import { usePluginStore } from "@/stores/plugin";
import { ComponentType, useEffect, useState } from "react";
import { TLBaseShape, TLDefaultColorStyle, ShapeUtil, Geometry2d, Rectangle2d, HTMLContainer, getDefaultColorTheme, useEditor, TLOnResizeHandler, resizeBox } from "tldraw";

type Shape = TLBaseShape<
    'rect',
    {
        w: number,
        h: number,
        color: TLDefaultColorStyle,
    }
>

export default class RectShapeUtil extends ShapeUtil<Shape> {
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

        const { getPlugin, selected } = usePluginStore();
        const plugin = getPlugin(selected);
        // const editor = useEditor();

        // ?  Not necessary anymore since props can't be accessed after shape deletion but plugin properties need to be accessed in the remove event (done via meta now)
        // useEffect(() => {
        //     editor.updateShape<Shape>({
        //         ...shape,
        //         props: {
        //             ...shape.props,
        //             pluginProps: plugin?.properties
        //         }
        //     });
        // }, [editor, plugin?.properties, shape])

        // TODO check if plugin has a custom component, if component exists then put the component in the center and
        // TODO the logo somewhere outside of the shape, if component not exists then put logo in center

        // * Adjust style to filter which tldraw styling panel options are available
        // ? https://tldraw.dev/examples/shapes/tools/shape-with-tldraw-styles
        return (
            <HTMLContainer
                id={shape.id}
                className="flex flex-col items-center justify-center"
                style={{
                    border: '1px solid black',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'all',
                    backgroundColor: theme[shape.props.color].semi,
                    color: theme[shape.props.color].solid,
                }}
            >
                {/* Add custom component in the shape's context if it exists */}
                {plugin?.component && <plugin.component />}
            </HTMLContainer>
        )
    }
    indicator(shape: Shape) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }
    override onResize: TLOnResizeHandler<Shape> = (shape, info) => {
        return resizeBox(shape, info);
    }
}