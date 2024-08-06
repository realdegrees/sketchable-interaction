import { useEffect, useState } from "react";
import { PluginData } from "../base";
import { TLShape, useEditor } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import plugin from "./plugin";
import FilePlugin from "@/plugins/file/plugin";
import Image from "next/image";
import { readFile } from "fs/promises";
import ImageIcon from '~icons/material-symbols/image-outline.jsx';
import TextIcon from '~icons/lucide/file-text.jsx';
import AudioIcon from '~icons/material-symbols/audio-file-outline.jsx';
import VideoIcon from '~icons/ph/video.jsx';
import AppIcon from '~icons/tdesign/app.jsx';
import ModelIcon from '~icons/mingcute/cube-3d-line.jsx';
import AlertIcon from '~icons/line-md/alert-circle-twotone-loop.jsx';
import LoadingIcon from '~icons/svg-spinners/90-ring-with-bg.jsx';
import { fromBlob, toDataUrl } from "@/util/blob";
import folderPlugin from "@/plugins/folder/plugin";
import { DefaultExtensionType, FileIcon, defaultStyles } from 'react-file-icon';
import { lookup } from "mime-types";
import { getMimeType } from "@/util/getMimeType";

// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {

    const { sourceShape, dir, name, extension } = data?.attachments?.[0] ?? {};    
    const isEffectEnabled = data?.state?.activeEffects?.includes('magnify') ?? false;

    const [dataUrl, setDataUrl] = useState<string>();
    const editor = useEditor().bringForward([shape]); // get editor and send file shape to front as files should always be on top
    const isHovered = editor.getHoveredShapeId() === shape.id;

    useEffect(() => {
        (async () => {
            const fileHandle = sourceShape && folderPlugin.getHandle(sourceShape, name, extension);

            const file = await fileHandle?.getFile();
            const dataUrl = file ? await toDataUrl(file) : undefined;
            setDataUrl(dataUrl);
        })();

    }, [setDataUrl, editor, shape, sourceShape, extension, name])

    if (!dir || !extension || !name) return <AlertIcon className="w-2/3 h-2/3" />;
    if (!dataUrl) return <LoadingIcon className="w-2/3 h-2/3" />;

    // Defines a preview of the file based on the mimeType
    const mimeCategory = getMimeType(extension)?.split('/')[0];
    const previewContent = (() => {
        switch (mimeCategory) {
            case 'image': {
                return <Image src={dataUrl} alt={name} width={500} height={500} />;
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
        title={name}
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
            <FileIcon extension={showPreviewContent || isHovered ? name : (extension ?? 'unknown')} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} fold={!showPreviewContent} />
        </div>
    </div>

}
export default Component;