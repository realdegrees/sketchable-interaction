import { useEffect, useRef, useState } from "react";
import { JsonObject, TLShape, useEditor } from "tldraw";
import { toDataUrl } from "@/util/blob";
import folderPlugin from "@/plugins/folder/plugin";
import { ReactPhotoEditor } from "react-photo-editor";
import ImageEditorPlugin, { ImageEditorData } from "./plugin";
import { unwrapShape } from "@/util/pluginUtil";
import { FileData } from "../file/plugin";
import plugin from "./plugin";
import { getMimeType } from "@/util/getMimeType";


// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: ImageEditorData }) => {
    const editor = useEditor();
    const [file, setFile] = useState<File>();
    const [fileData, setFileData] = useState<FileData>();

    useEffect(() => {
        editor.bringForward([shape]);
        (async () => {
            const { sourceShape, extension, name } = fileData ?? {};
            const fileHandle = sourceShape && folderPlugin.getHandle(sourceShape, name, extension);

            const file = await fileHandle?.getFile();
            setFile(file);
        })();

        const unsub = [
            plugin.on<FileData>('file', shape.id, (data) => {
                if (!fileData) setFileData(data);
            }),
            plugin.on<FileData>('end', shape.id, setFileData),
        ]
        return () => {
            unsub.forEach((f) => f())
        }
    }, [setFile, editor, shape, fileData])

    if (!file) return <p>Drag an image file here to edit it</p>;
    if (!fileData?.extension || getMimeType(fileData.extension) !== 'image') return <p>{`${fileData?.extension} file extension is not supported!`}</p>;

    return <div
        className={`flex items-center justify-center relative !p-8`}
        onPointerDown={(e) => e.stopPropagation()}
    >
        <ReactPhotoEditor file={file} open={!!file} onSaveImage={async (editedFile) => {
            {
                const connectedImage = Array.from(ImageEditorPlugin.connectedShapes.keys())[0];
                const { plugin, data } = (connectedImage && unwrapShape<FileData>(editor.getShape(connectedImage))) ?? {};
                if(!data) return;
                const { sourceShape, extension, name } = data;
                const originalFileHandle = folderPlugin.getHandle(sourceShape, name, extension);
                const writeStream = await originalFileHandle?.createWritable();
                await writeStream?.write(editedFile);
                await writeStream?.close();
            }
        }} />
    </div>

}
export default Component;