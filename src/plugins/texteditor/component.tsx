import { useCallback, useEffect, useState } from "react";
import { useEditor } from "tldraw";
import ReactQuill from "react-quill";
import { getMimeType } from "@/util/getMimeType";
import { PluginComponent, usePluginStore } from "@/stores/plugin";
import TextEditorPlugin from "./plugin";
import { TextEditorData } from "./config";
import FolderPlugin from "../folder/plugin";
import { FileData } from "../file/config";
import { PluginUtil } from "@/util/pluginUtil";

const Component: PluginComponent<TextEditorData, TextEditorPlugin> = ({ shape, data, plugin }) => {
    const editor = useEditor();
    const [text, setText] = useState<string | undefined>();
    const [fileData, setFileData] = useState<FileData>();

    const debouncedSave = useCallback(async (newValue: string) => {
        const { sourceShape, extension, name } = fileData ?? {};
        const folderPlugin = sourceShape && PluginUtil.getPlugin<FolderPlugin>(sourceShape);
        const originalFileHandle = folderPlugin?.handles?.files.find(({ name: fname }) => fname === `${name}.${extension}`);
        const writeStream = await originalFileHandle?.createWritable();
        await writeStream?.write(newValue);
        await writeStream?.close();
    }, [fileData]);

    useEffect(() => {
        editor.bringForward([shape]);
        let unsub: (() => void)[] | undefined;
        (async () => {
            if (text) return;
            unsub = plugin && [
                plugin.on<FileData>('file', (data) => {
                    if (!fileData) setFileData(data);
                }),
                plugin.on<FileData>('end', () => {
                    setFileData(undefined);
                    setText(undefined);
                }),
            ];

            const { sourceShape, extension, name } = fileData ?? {};
            const isText = !!extension && getMimeType(extension) === 'text';
            if(!isText) return;

            const folderPlugin = (sourceShape && PluginUtil.getPlugin<FolderPlugin>(sourceShape));
            const fileHandle = sourceShape && folderPlugin?.handles?.files.find(({ name: fname }) => fname === `${name}.${extension}`);

            const file = await fileHandle?.getFile();
            const _text = file && await file.text();
            setText(_text);

        })();


        return () => {
            unsub?.forEach((f) => f())
        }
    }, [editor, shape, fileData, plugin, text])

    if (!fileData && !text) return <p>Drag a text file here to edit it</p>;
    if (!fileData?.extension || getMimeType(fileData.extension) !== 'text') return <p>{`${fileData?.extension} file extension is not supported!`}</p>;

    return <div
        className={`overflow-auto p-2 w-full h-fit`}
        onPointerDown={(e) => e.stopPropagation()}
    >
        <ReactQuill theme="snow" value={text} onChange={async (newValue) => {
            setText(newValue);
            debouncedSave(newValue);
        }} />
    </div>

}
export default Component;