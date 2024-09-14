import { useEffect } from "react";
import { TLShape, useEditor } from "tldraw";
import { DefaultExtensionType, FileIcon, defaultStyles } from 'react-file-icon';
import { FileData } from "./plugin";
import { PluginComponent } from "@/stores/plugin";

// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component: PluginComponent<FileData> = ({ shape, data, plugin }) => {
    const editor = useEditor();
    const isHovered = editor.getHoveredShapeId() === shape.id;

    useEffect(() => {
        editor.bringForward([shape]);
    }, [editor, shape])

    
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