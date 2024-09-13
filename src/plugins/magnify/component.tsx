import { useEffect, useState } from "react";
import { TLShape, useEditor } from "tldraw";
import folderPlugin from "@/plugins/folder/plugin";
import { ReactPhotoEditor } from "react-photo-editor";
import ImageEditorPlugin, { MagnifyData } from "./plugin";
import { unwrapShape } from "@/util/pluginUtil";
import { FileData } from "../file/plugin";
import MagnifyPlugin from "./plugin";
import { getMimeType } from "@/util/getMimeType";
import Image from "next/image";
import { toDataUrl } from "@/util/blob";
import plugin from "./plugin";


// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: MagnifyData }) => {

    const [file, setFile] = useState<File>();
    const [dataUrl, setDataUrl] = useState<string>();
    const [fileData, setFileData] = useState<FileData>();
    const editor = useEditor();

    useEffect(() => {
        editor.bringForward([shape]);
        (async () => {
            const { sourceShape, extension, name } = fileData ?? {};
            const fileHandle = sourceShape && folderPlugin.getHandle(sourceShape, name, extension);

            const file = await fileHandle?.getFile();
            const dataUrl = file && await toDataUrl(file);
            setFile(file);
            setDataUrl(dataUrl);
        })();

        const unsub = [
            plugin.on<FileData>('file', shape.id, (data) => {
                if(!fileData) setFileData(data);
            }),
            plugin.on<FileData>('end', shape.id, setFileData),
        ]
        return () => {
            unsub.forEach((f) => f())
        }
    }, [setFile, editor, shape, fileData])

    if (!fileData || !fileData.name || !fileData.extension) return <p>Drag a file here to view its content</p>;
    if (!file || !dataUrl) return <p>Unable to load file</p>;

    const mimeType = fileData.extension && getMimeType(fileData.extension);
    const content = (() => {
        switch (mimeType) {
            case 'image': {
                return <Image src={dataUrl} alt={fileData.name} width={500} height={500} />;
            }
            case 'text': {
                return <p>text not implemented</p>;
            }
            case 'audio': {
                return <audio src={dataUrl} onPointerDown={(e) => e.stopPropagation()} autoPlay={true} onPlay={({ currentTarget }) => {
                    currentTarget.volume = 0.03;
                }} />;
            }
            case 'video': {
                return <video src={dataUrl} onPointerDown={(e) => e.stopPropagation()} autoPlay={true} onPlay={({ currentTarget }) => {
                    currentTarget.volume = 0.03;
                }} />;
            }
            case 'model': {
                return <p>model not implemented</p>; // TODO maybe add a nice 3d model viewer if there are any for react
            }
            default: {
                return <p>This filetype cannot be displayed</p>;
            }
        }
    })();

    return <div
        className={`flex items-center justify-center flex-col relative !p-8`}
    >
        <p>{`${fileData.dir}/${fileData.name}.${fileData.extension}`}</p>
        <hr className="h-1 w-full mb-0 mt-2"></hr>
        <div className="h-full w-full">
            {content}
        </div>

    </div>

}
export default Component;