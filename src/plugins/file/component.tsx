import { useEffect } from "react";
import { TLShape, useEditor } from "tldraw";
import { DefaultExtensionType, FileIcon, defaultStyles } from 'react-file-icon';
import { PluginComponent } from "@/stores/plugin";
import { FileData } from "./config";
import FilePlugin from "./plugin";

const Component: PluginComponent<FileData, FilePlugin> = ({ shape, data, plugin }) => {
    const editor = useEditor();
    const isHovered = editor.getHoveredShapeId() === shape.id;

    return <div
        title={data?.name}
        className={`flex items-center justify-center relative`}
    >
        <div>
            <FileIcon extension={isHovered ? (data?.extension ?? 'unknown') : data?.name} {...(data?.extension ? defaultStyles[data?.extension as DefaultExtensionType] : defaultStyles.cs)} fold={isHovered} />
        </div>
    </div>

}
export default Component;