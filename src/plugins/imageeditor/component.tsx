import { useCallback, useEffect, useState } from "react";
import { useEditor } from "tldraw";
import { ReactPhotoEditor } from "react-photo-editor";
import ImageEditorPlugin from "./plugin";
import { getMimeType } from "@/util/getMimeType";
import { PluginComponent } from "@/stores/plugin";
import { ImageEditorData } from "./config";
import { FileData } from "../file/config";
import { PluginUtil } from "@/util/pluginUtil";
import FolderPlugin from "../folder/plugin";


const Component: PluginComponent<ImageEditorData, ImageEditorPlugin> = ({ shape, data, plugin }) => {
    const editor = useEditor();
    const [file, setFile] = useState<File>();
    const [fileData, setFileData] = useState<FileData>();

    const debouncedSave = useCallback(async (editedFile: File) => {
        const { sourceShape, extension, name } = fileData ?? {};
        const folderPlugin = sourceShape && PluginUtil.getPlugin<FolderPlugin>(sourceShape);
        const originalFileHandle = folderPlugin?.handles?.files.find(({ name: fname }) => fname === `${name}.${extension}`);
        const writeStream = await originalFileHandle?.createWritable();
        await writeStream?.write(editedFile);
        await writeStream?.close();
    }, [fileData]);

    useEffect(() => {
        editor.bringForward([shape]);
        (async () => {
            if (file) return;
            const { sourceShape, extension, name } = fileData ?? {};
            const isImage = !!extension && getMimeType(extension) === 'image';
            if (!isImage) return;

            const folderPlugin = (sourceShape && PluginUtil.getPlugin<FolderPlugin>(sourceShape));
            const fileHandle = sourceShape && folderPlugin?.handles?.files.find(({ name: fname }) => fname === `${name}.${extension}`);

            const _file = await fileHandle?.getFile();
            setFile(_file);
        })();

        const unsub = plugin && [
            plugin.on<FileData>('file', (data) => {
                if (!fileData) setFileData(data);
            }),
            plugin.on<FileData>('end', () => {
                setFileData(undefined);
                setFile(undefined);
            }),
        ]
        return () => {
            unsub?.forEach((f) => f())
        }
    }, [setFile, editor, shape, fileData, plugin, file])

    if (!file && !fileData) return <p>Drag an image file here to edit it</p>;
    if (!fileData?.extension || getMimeType(fileData.extension) !== 'image') return <p>{`${fileData?.extension} file extension is not supported!`}</p>;

    return <div
        className={`m-8 w-full h-full`}
        onPointerDown={(e) => e.stopPropagation()}
    >
        <ReactPhotoEditor canvasHeight={'auto'} canvasWidth={'auto'} file={file} open={!!file} onSaveImage={async (editedFile) => {
            {
                debouncedSave(editedFile);
            }
        }} />
    </div>

}
export default Component;