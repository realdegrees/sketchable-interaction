import { useEffect, useState } from "react";
import { PluginData } from "../base";
import { TLShape, useEditor } from "tldraw";
import folderPlugin from "@/plugins/folder/plugin";
import ReactQuill from "react-quill";


// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {

    const { sourceShape, name, extension } = data?.attachments?.[0] ?? {};
    const [value, setValue] = useState<string>();
    const editor = useEditor();

    useEffect(() => {
        editor.bringForward([shape]);
        (async () => {
            const fileHandle = sourceShape && folderPlugin.getHandle(sourceShape, name, extension);

            const file = await fileHandle?.getFile();
            const text = await file?.text();
            setValue(text);
        })();

    }, [setValue, editor, shape, sourceShape, extension, name])

    if (!sourceShape || !value) return <p>Drag a text file here to edit it</p>;

    return <div
        title={name}
        className={`flex items-center justify-center relative`}
        onPointerDown={(e) => e.stopPropagation()}
    >
        <ReactQuill theme="snow" value={value} onChange={async (newValue) => {
            const originalFileHandle = folderPlugin.getHandle(sourceShape, name, extension);
            const writeStream = await originalFileHandle?.createWritable();
            await writeStream?.write(newValue);
            await writeStream?.close();
        }}/>
    </div>

}
export default Component;