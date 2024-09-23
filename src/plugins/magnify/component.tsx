import { Suspense, useEffect, useState } from "react";
import { useEditor } from "tldraw";
import { getMimeType } from "@/util/getMimeType";
import Image from "next/image";
import { toDataUrl } from "@/util/blob";
import { ErrorBoundary } from "react-error-boundary";
import LoadingIcon from '~icons/line-md/alert-circle-twotone-loop.jsx';
import { PluginComponent, usePluginStore } from "@/stores/plugin";
import MagnifyPlugin from "./plugin";
import { MagnifyData } from "./config";
import { PluginUtil } from "@/util/pluginUtil";
import { FolderData } from "../folder/config";
import FolderPlugin from "@/plugins/folder/plugin";
import { FileData } from "../file/config";

const supportedMimeTypes = ['image', 'video', 'text', 'audio'];
const Component: PluginComponent<MagnifyData, MagnifyPlugin> = ({ shape, data, plugin }) => {

    const [file, setFile] = useState<File>();
    const [dataUrl, setDataUrl] = useState<string>();
    const [text, setText] = useState<string>();
    const [fileData, setFileData] = useState<FileData>();
    const editor = useEditor();

    useEffect(() => {
        (async () => {
            if(file) return;

            const { sourceShape, extension, name } = fileData ?? {};
            const mimeType = extension && getMimeType(extension);
            const isFileSupported = mimeType && supportedMimeTypes.includes(mimeType);

            if (!isFileSupported) return;

            const folderPlugin = sourceShape && PluginUtil.getPlugin<FolderPlugin>(sourceShape);

            const fileHandle = sourceShape && folderPlugin?.handles?.files.find(({ name: fname }) => fname === `${name}.${extension}`);

            const _file = await fileHandle?.getFile();
            setFile(_file);
            const dataUrl = _file && await toDataUrl(_file);
            setDataUrl(dataUrl);
            const text = _file && await _file.text();
            setText(text);
        })();

        const unsub = plugin && [
            plugin.on<FileData>('file', (data) => {
                if (!fileData) setFileData(data);
            }),
            plugin.on<FileData>('end', () => {
                setFileData(undefined);
                setFile(undefined);
                setText(undefined);
                setDataUrl(undefined);
            }),
        ];
        return () => {
            unsub?.forEach((f) => f())
        }
    }, [setFile, editor, shape, fileData, plugin, file])

    if (!fileData || !fileData.name || !fileData.extension) return <p>Drag a file here to view its content</p>;
    if (!file || !dataUrl) return <LoadingIcon className="w-1/2 h-1/2" />;

    const mimeType = fileData.extension && getMimeType(fileData.extension);
    const content = (() => {
        switch (mimeType) {
            case 'image': {
                return <Image className={'w-full h-full pointer-events-none'} src={dataUrl} alt={fileData.name} width={500} height={500} />;
            }
            case 'text': {
                return <p className="w-full h-full overflow-hidden">{text}</p>;
            }
            case 'audio': {
                return <audio className={'w-full h-full pointer-events-none'} src={dataUrl} autoPlay={true} onPlay={({ currentTarget }) => {
                    currentTarget.volume = 0.03;
                }} />;
            }
            case 'video': {
                return <video className={'w-full h-full pointer-events-none'} src={dataUrl} autoPlay={true} onPlay={({ currentTarget }) => {
                    currentTarget.volume = 0.03;
                }} >
                    <LoadingIcon className="w-1/2 h-1/2" />
                </video>;
            }
            case 'model': {
                return <p>model not implemented</p>;
            }
            default: {
                return <p>This filetype cannot be displayed</p>;
            }
        }
    })();

    return <div
        className={`flex items-center justify-center flex-col relative h-full p-4`}
    >
        <p className="mb-1">{`${fileData.dir}/${fileData.name}.${fileData.extension}`}</p>
        <hr className="h-1 w-full mb-0"></hr>
        <div className="aspect-auto w-full h-full">
            <Suspense fallback={<LoadingIcon className="w-1/2 h-1/2" />}>
                <ErrorBoundary fallback={<p>Display Error</p>}>{content}</ErrorBoundary>
            </Suspense>
        </div>

    </div>
}
export default Component;