import { useEffect, useState } from "react";
import { PluginData } from "../base";
import LineMdAlertCircleTwotoneLoop from '~icons/line-md/alert-circle-twotone-loop';
import { TLShape, useEditor } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import plugin from "./plugin";
import FilePlugin from "@/plugins/file/plugin";
import Image from "next/image";
import { readFile } from "fs/promises";
import ImageIcon from '~icons/material-symbols/image-outline';
import TextIcon from '~icons/lucide/file-text';
import AudioIcon from '~icons/material-symbols/audio-file-outline';
import VideoIcon from '~icons/ph/video';
import AppIcon from '~icons/tdesign/app';
import ModelIcon from '~icons/mingcute/cube-3d-line';
import LoadingIcon from '~icons/line-md/alert-circle-twotone-loop';
import { fromBlob, toDataUrl } from "@/util/blob";
import folderPlugin from "@/plugins/folder/plugin";
import { DefaultExtensionType, FileIcon, defaultStyles } from 'react-file-icon';
import { unknown } from "zod";

// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {

    const { mimeType, sourceShape, fullPath, name, extension } = data?.files?.[0] ?? {};

    const [dataUrl, setDataUrl] = useState<string>();
    const [hovered, setHovered] = useState<boolean>();
    const [selected, setSelected] = useState<boolean>();

    const editor = useEditor();
    useEffect(() => {
        (async () => {
            const fileHandle = folderPlugin.getFileHandle(sourceShape, fullPath);
            const file = await fileHandle?.getFile();
            const dataUrl = file ? await toDataUrl(file) : undefined;
            setDataUrl(dataUrl);
        })();

        setSelected(!!editor.getSelectedShapes().find(({ id }) => id === shape.id));
        setHovered(!shape || editor.getHoveredShapeId() === shape.id);
    }, [setDataUrl, editor, shape, setSelected, setHovered, sourceShape, fullPath])


    if (!fullPath) return <p className="bg-red-500">No file attached!</p>;
    if (!dataUrl) return <LoadingIcon className="w-2/3 h-2/3" />;

    // Defines a preview of the file based on the mimeType
    const mimeCategory = mimeType?.split('/')[0];
    const hoverContent = (() => {
        switch (mimeCategory) {
            case 'image': {
                return <Image src={dataUrl} alt={`${fullPath} image`} width={5000} height={5000} className="pointer-events-none" />;
            }
            case 'text': {
                return <TextIcon className="w-2/3 h-2/3" />;
            }
            case 'audio': {
                return <audio src={dataUrl} onPointerDown={(e) => e.stopPropagation()} autoPlay={true} onPlay={({ currentTarget }) => {
                    currentTarget.volume = 0.05;
                }} />;

            }
            case 'video': {
                return <video src={dataUrl} onPointerDown={(e) => e.stopPropagation()} autoPlay={true} onPlay={({ currentTarget }) => {
                    currentTarget.volume = 0.05;
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

    return <div
        onMouseEnter={() => {
            setHovered(true);
        }}
        onMouseLeave={() => {
            setHovered(false);
        }}
        title={name}
        className="w-full h-full flex items-center justify-center relative"
    >
        {   // Shows the files preview content above the file
            (hovered || data?.state?.effectEnabled) &&
            !!hoverContent &&
            <div className="absolute top-0 left-0  -translate-y-full animate-bounce">
                {hoverContent}
            </div>
        }
        <FileIcon extension={hovered ? name : (extension ?? 'unknown')} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} fold={!hovered} />
    </div>

}
export default Component;