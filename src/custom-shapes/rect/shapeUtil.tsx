/* eslint-disable react-hooks/rules-of-hooks */ // ESLint thinks this is a class component but it's not according to tldraw documentation

import { useHoverEvent } from "@/hooks/useHoverEvent";
import { unwrapShape } from "@/util/pluginUtil";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { TLBaseShape, TLDefaultColorStyle, Geometry2d, Rectangle2d, HTMLContainer, getDefaultColorTheme, BaseBoxShapeUtil, useEditor, TLGeoShape, HistoryEntry, TLRecord } from "tldraw";

type CustomRectShape = TLBaseShape<
    'rect',
    {
        w: number,
        h: number,
        color: TLDefaultColorStyle
    }
>

export default class RectShapeUtil extends BaseBoxShapeUtil<CustomRectShape> {
    static override type = 'rect' as const;

    getDefaultProps(): CustomRectShape['props'] {
        return {
            w: 200,
            h: 200,
            color: 'black'
        }
    }
    getGeometry(shape: CustomRectShape): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true,
        })
    }
    component(shape: CustomRectShape) {
        const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })

        const { plugin, Component, icon, data } = unwrapShape(shape) ?? {};
        const editor = useEditor();
        useHoverEvent(editor, shape);

        const [debugData, setDebugData] = useState<{
            id: string,
            x: number,
            y: number,
            w: number,
            h: number,
            plugin?: string
        }>({
            id: shape.id,
            x: shape.x,
            y: shape.y,
            w: shape.props.w,
            h: shape.props.h,
        });

        useEffect(() => {
            if (!editor.getInstanceState().isDebugMode) return;
            
            const listener = ({ changes: { updated } }: HistoryEntry<TLRecord>) => {
                for (const [, { id }] of Object.values(updated)) {
                    if (id === shape.id) {
                        const updatedShape = editor.getShape(id) as TLGeoShape;
                        const {plugin} = unwrapShape(updatedShape) ?? {};
                        setDebugData({
                            id: updatedShape.id,
                            x: updatedShape.x,
                            y: updatedShape.y,
                            w: updatedShape.props.w,
                            h: updatedShape.props.h,
                            plugin: plugin?.id
                        })
                    }
                }
            }
            editor.addListener('change', listener);
            return () => {
                editor.removeListener('change', listener);
            };
        }, [shape, setDebugData, editor]);

        const fallback = icon ? <Image src={icon} alt="logo" loading="lazy" className="pointer-events-none w-2/3 h-2/3" /> : <p>{plugin?.properties.label ?? plugin?.properties.id ?? 'Unable to load icon or component'}</p>;
        // * Adjust style to filter which tldraw styling panel options are available
        // ? https://tldraw.dev/examples/shapes/tools/shape-with-tldraw-styles
        return (
            <HTMLContainer
                id={shape.id}
                className="border relative rounded-lg  hover:opacity-[98%]"
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
                        <Suspense fallback={<p>Loading</p>}>
                            <Component data={data} shape={shape} />
                        </Suspense>
                    </ErrorBoundary> : fallback}
                </div>
                {
                    Component && icon && <Image src={icon} alt="logo" className="absolute left-0 -bottom-12 w-12 h-12 pointer-events-none" />
                }
                {editor.getInstanceState().isDebugMode && <div className="absolute right-0 -bottom-2 translate-y-[100%] ml-auto !opacity-100">
                    {
                        ...[
                            debugData.id,
                            debugData.plugin,
                            `x: ${debugData.x.toFixed()} y:${debugData.y.toFixed()}`,
                            `w: ${debugData.w.toFixed()} h: ${debugData.h.toFixed()}`,
                            `Center x:${parseInt(debugData.x.toFixed()) + parseInt(debugData.w.toFixed()) / 2} y: ${parseInt(debugData.y.toFixed()) + parseInt(debugData.h.toFixed()) / 2}`,
                        ].filter((v): v is string => !!v).map((line) => <p className="text-md text-end text-nowrap" key={line}>{line}</p>)
                    }
                </div>
                }
            </HTMLContainer >
        )
    }
    indicator(shape: CustomRectShape) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }

}