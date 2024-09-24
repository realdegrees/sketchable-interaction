import { PluginUtil } from "@/util/pluginUtil";
import { useEffect, useRef, useState } from "react";
import { Editor, TLEventInfo, TLShape } from "tldraw";

/**
 * Rerenders the shape whenever it's hovered and notifies the attached plugin about the hover state
 * @param editor 
 * @param shape 
 */
export const useHoverEvent = (editor: Editor, shape: TLShape) => {
    const [isHovered, setHovered] = useState<boolean>(false);
    const isPointerDown = useRef(false);
    const plugin = PluginUtil.getPlugin(shape.id);

    useEffect(() => {
        if (!plugin) return;

        const pointerListener = (e: TLEventInfo) => {
            if (e.name === 'pointer_down') {
                isPointerDown.current = true;
            }
            else if (e.name === 'pointer_up') {
                isPointerDown.current = false;
            }
        };
        const changeListener = () => {
            if(isPointerDown.current) return;

            const hoveredShape = editor.getHoveredShape();
            if (!isHovered && hoveredShape?.id === shape.id) {
                plugin.onShapeHovered();
                setHovered(true);
            }
            if (isHovered && hoveredShape?.id !== shape.id) {
                plugin.onShapeUnhovered();
                setHovered(false);
            }

        }
        editor.on('event', pointerListener);
        editor.on('change', changeListener);

        return () => {
            editor.removeListener('event', pointerListener);
            editor.removeListener('change', changeListener);
        }
    }, [editor, plugin, shape.id, isHovered, isPointerDown])
};
