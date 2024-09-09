import { useEffect, useRef, useState } from "react";
import { PluginData } from "../base";
import { TLShape, useEditor } from "tldraw";
import { toDataUrl } from "@/util/blob";
import folderPlugin from "@/plugins/folder/plugin";
import { ReactPhotoEditor } from "react-photo-editor";


// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {

    const { sourceShape, name, extension } = data?.attachments?.[0] ?? {};
    const [file, setFile] = useState<File>();
    const editor = useEditor();

    useEffect(() => {
        editor.bringForward([shape]);
        (async () => {
            const fileHandle = sourceShape && folderPlugin.getHandle(sourceShape, name, extension);

            const file = await fileHandle?.getFile();
            setFile(file);
        })();

    }, [setFile, editor, shape, sourceShape, extension, name])

    if (!sourceShape || !file) return <p>Drag an image file here to edit it</p>;

    return <div
        title={name}
        className={`flex items-center justify-center relative !p-8`}
        onPointerDown={(e) => e.stopPropagation()}
    >
        <ReactPhotoEditor file={file} open={!!file} onSaveImage={async (editedFile) => {
            {
                const originalFileHandle = folderPlugin.getHandle(sourceShape, name, extension);
                const writeStream = await originalFileHandle?.createWritable();
                await writeStream?.write(editedFile);
                await writeStream?.close();
            }
        }} />
    </div>

}
export default Component;