import { useEffect, useState } from "react";
import { useEditor } from "tldraw";
import ReactQuill from "react-quill";
import { getMimeType } from "@/util/getMimeType";
import { PluginComponent, usePluginStore } from "@/stores/plugin";
import TextEditorPlugin from "./plugin";
import { TextEditorData } from "./config";
import FolderPlugin from "../folder/plugin";
import { FileData } from "../file/config";
import { PluginUtil } from "@/util/pluginUtil";

const OVERRIDE_ON_COLLISION = true;

// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component: PluginComponent<TextEditorData, TextEditorPlugin> = ({ shape, data, plugin }) => {
    const editor = useEditor();
    const [text, setText] = useState<string>();
    const [fileData, setFileData] = useState<FileData>();

    useEffect(() => {
        editor.bringForward([shape]);
        (async () => {
            const { sourceShape, extension, name } = fileData ?? {};
            const folderPlugin = (sourceShape && PluginUtil.getPlugin<FolderPlugin>(sourceShape));
            const fileHandle = sourceShape && folderPlugin?.handles?.files.find(({ name: fname }) => fname === `${name}.${extension}`);

            const file = await fileHandle?.getFile();
            const text = file && await file.text();
            setText(text);
        })();

        const unsub = plugin && [
            plugin.on<FileData>('file', (data) => {
                if (!fileData || OVERRIDE_ON_COLLISION) setFileData(data);
            }),
            plugin.on<FileData>('end', setFileData),
        ]
        return () => {
            unsub?.forEach((f) => f())
        }
    }, [editor, shape, fileData, plugin])

    if (!text) return <p>Drag a text file here to edit it</p>;
    if (!fileData?.extension || getMimeType(fileData.extension) !== 'text') return <p>{`${fileData?.extension} file extension is not supported!`}</p>;

    return <div
        className={`flex items-center justify-center relative`}
        onPointerDown={(e) => e.stopPropagation()}
    >
        <ReactQuill theme="snow" value={text} onChange={async (newValue) => {
            const { sourceShape, extension, name } = fileData;
            const folderPlugin = sourceShape && PluginUtil.getPlugin<FolderPlugin>(sourceShape);
            const originalFileHandle = folderPlugin?.handles?.files.find(({ name: fname }) => fname === `${name}.${extension}`);
            const writeStream = await originalFileHandle?.createWritable();
            await writeStream?.write(newValue);
            await writeStream?.close();
        }} />
    </div>

}
export default Component;