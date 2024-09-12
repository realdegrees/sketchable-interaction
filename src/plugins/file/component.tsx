import { useEffect, useState } from "react";
import { PluginData } from "../base";
import { TLShape, useEditor } from "tldraw";
import Image from "next/image";
import TextIcon from '~icons/lucide/file-text.jsx';
import ModelIcon from '~icons/mingcute/cube-3d-line.jsx';
import AlertIcon from '~icons/line-md/alert-circle-twotone-loop.jsx';
import LoadingIcon from '~icons/svg-spinners/90-ring-with-bg.jsx';
import { toDataUrl } from "@/util/blob";
import folderPlugin from "@/plugins/folder/plugin";
import { DefaultExtensionType, FileIcon, defaultStyles } from 'react-file-icon';
import { getMimeType } from "@/util/getMimeType";
import { unwrapShape } from "@/util/pluginUtil";
import { FileData } from "./plugin";

// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {

    const isEffectEnabled = data?.state?.activeEffects?.includes('magnify') ?? false;

    const [dataUrl, setDataUrl] = useState<string>();
    const [fileData, setFileData] = useState<FileData>();
    const editor = useEditor();
    const isHovered = editor.getHoveredShapeId() === shape.id;

    useEffect(() => {
        editor.bringForward([shape]);
        if(dataUrl) return;
        (async () => {
            const { data } = unwrapShape<FileData>(editor.getShape(shape)) ?? {};            
            const { sourceShape, extension, name } = data ?? {};
            
            const fileHandle = sourceShape && folderPlugin.getHandle(sourceShape, name, extension);

            const file = await fileHandle?.getFile();
            const dataUrl = file ? await toDataUrl(file) : undefined;
            setDataUrl(dataUrl);
            setFileData(data);
        })();

    }, [setDataUrl, dataUrl, editor, shape])

    if (!fileData?.name || !fileData.extension || !fileData.name) return <AlertIcon className="w-2/3 h-2/3" />;
    if (!dataUrl) return <LoadingIcon className="w-2/3 h-2/3" />;

    // Defines a preview of the file based on the mimeType
    const mimeCategory = getMimeType(fileData.extension)?.split('/')[0];
    const previewContent = (() => {
        switch (mimeCategory) {
            case 'image': {
                return <Image src={dataUrl} alt={fileData.name} width={500} height={500} />;
            }
            case 'text': {
                return <TextIcon className="w-2/3 h-2/3" />;
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
                return <ModelIcon className="w-2/3 h-2/3" />; // TODO maybe add a nice 3d model viewer if there are any for react
            }
            default: {
                return undefined;
            }
        }
    })();
    const showPreviewContent = isEffectEnabled;
    return <div
        title={fileData.name}
        className={`flex items-center justify-center relative`}
    >
        {   // Shows the files preview content above the file
            showPreviewContent &&
            !!previewContent &&
            <div className={`absolute -top-2 left-0 -translate-y-full`}>
                {previewContent}
            </div>
        }
        <div className={`${showPreviewContent && 'animate-pulse'}`}>
            <FileIcon extension={showPreviewContent || isHovered ? (fileData.extension ?? 'unknown') : fileData.name} {...(fileData.extension ? defaultStyles[fileData.extension as DefaultExtensionType] : defaultStyles.cs)} fold={!showPreviewContent} />
        </div>
    </div>

}
export default Component;