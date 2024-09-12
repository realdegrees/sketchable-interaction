import { useEffect } from "react";
import { TLShape, useEditor } from "tldraw";
import { DefaultExtensionType, FileIcon, defaultStyles } from 'react-file-icon';
import { FileData } from "./plugin";

// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: FileData }) => {
    // const [dataUrl, setDataUrl] = useState<string>();
    // const [fileData, setFileData] = useState<FileData>();
    const editor = useEditor();
    const isHovered = editor.getHoveredShapeId() === shape.id;

    useEffect(() => {
        editor.bringForward([shape]);
        // if (dataUrl) return;
        // (async () => {
        //     const { data } = unwrapShape<FileData>(editor.getShape(shape)) ?? {};
        //     const { sourceShape, extension, name } = data ?? {};

        //     const fileHandle = sourceShape && folderPlugin.getHandle(sourceShape, name, extension);

        //     const file = await fileHandle?.getFile();
        //     const dataUrl = file ? await toDataUrl(file) : undefined;
        //     setDataUrl(dataUrl);
        //     setFileData(data);
        // })();

    }, [/*setDataUrl, dataUrl,*/ editor, shape])

    // Defines a preview of the file based on the mimeType
    // const mimeCategory = getMimeType(fileData.extension)?.split('/')[0];
    // const previewContent = (() => {
    //     switch (mimeCategory) {
    //         case 'image': {
    //             return <Image src={dataUrl} alt={fileData.name} width={500} height={500} />;
    //         }
    //         case 'text': {
    //             return <TextIcon className="w-2/3 h-2/3" />;
    //         }
    //         case 'audio': {
    //             return <audio src={dataUrl} onPointerDown={(e) => e.stopPropagation()} autoPlay={true} onPlay={({ currentTarget }) => {
    //                 currentTarget.volume = 0.03;
    //             }} />;
    //         }
    //         case 'video': {
    //             return <video src={dataUrl} onPointerDown={(e) => e.stopPropagation()} autoPlay={true} onPlay={({ currentTarget }) => {
    //                 currentTarget.volume = 0.03;
    //             }} />;
    //         }
    //         case 'model': {
    //             return <ModelIcon className="w-2/3 h-2/3" />; // TODO maybe add a nice 3d model viewer if there are any for react
    //         }
    //         default: {
    //             return undefined;
    //         }
    //     }
    // })();
    return <div
        title={data?.name}
        className={`flex items-center justify-center relative`}
    >
        <div>
            <FileIcon extension={isHovered ? (data?.extension ?? 'unknown') : data?.name} {...(data?.extension ? defaultStyles[data?.extension as DefaultExtensionType] : defaultStyles.cs)} fold={isHovered} />
        </div>
    </div>

}
export default Component;