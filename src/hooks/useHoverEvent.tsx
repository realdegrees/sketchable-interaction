import { unwrapShape } from "@/util/pluginUtil";
import { useEffect, useRef, useState } from "react";
import { Editor, TLShape } from "tldraw";

/**
 * Rerenders the shape whenever it's hovered and notifies the attached plugin about the hover state
 * @param editor 
 * @param shape 
 */
export const useHoverEvent = (editor: Editor, shape: TLShape) => {
    const [isHovered, setHovered] = useState<boolean>(false);
    const { plugin } = unwrapShape(shape) ?? {};

    useEffect(() => {
        if (!plugin) return;

        return editor.store.listen(({ changes: { updated } }) => {
            const hoveredShape = editor.getHoveredShape();

            if (!isHovered && hoveredShape?.id === shape.id) {
                plugin.onShapeHovered(shape.id, editor);
                setHovered(true);
            }
            if (isHovered && hoveredShape?.id !== shape.id) {
                plugin.onShapeUnhovered(shape.id, editor);
                setHovered(false);
            }

        });
    }, [editor, plugin, shape.id, isHovered])
};
