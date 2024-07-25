import { useCallback, useEffect, useState } from "react";
import { PluginData, PluginFile } from "../base";
import { useFileSystem } from "@/hooks/useFileSystem";
import AlertIcon from '~icons/line-md/alert-circle-twotone-loop';
import { TLShape, TLShapeId, useEditor } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import plugin from "./plugin";
import FilePlugin from "@/plugins/file/plugin";
import { unwrapShape } from "@/util/pluginUtil";


// TODO attempt to rework folders so that they include files as shapes from the start which are grouped together and the folder just encompasses them all
/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    const editor = useEditor();
    const [detachedFiles, setDetachedFiles] = useState<(PluginFile & { shape: TLShape })[]>([]);

    const getDetachedRef = (file: FileSystemFileHandle) => {
        return detachedFiles.find(({ name, extension }) => [name, extension].join('.') === file.name);
    };

    useEffect(() => {
        const detachedFiles = Array.from(FilePlugin.activeShapes.values())
            .map((shapeId) => {
                const shape = editor.getShape(shapeId);
                const { data } = unwrapShape(shape) ?? {};

                return {
                    shape,
                    ...data?.files?.[0]
                };
            })
            .filter((file): file is PluginFile & { shape: TLShape } => !!file.shape)
            .filter(({ sourceShape }) => sourceShape === shape.id);
        setDetachedFiles(detachedFiles);
    }, [editor, shape.id])

    const { files, directories, directoryHandle, showDirectoryPicker, isDirectoryPickerSupported } = useFileSystem({
        onChange: (previous, current) => {
            console.log('File change');
            
            const deletedFiles = previous.files.filter(({ name }) => current.files.find(({ name: cname }) => name === cname));

            // delete the shapes of all detachedFiles that were deleted
            deletedFiles.forEach((deletedFile) => {
                const detached = getDetachedRef(deletedFile);
                if (detached) editor.deleteShape(detached.shape);
            })

            // update the detachedFiles state and trigger re-render
            setDetachedFiles(detachedFiles.filter(({ name: detachedFileName }) => detachedFiles.find(({ name: deletedFileName }) => detachedFileName === deletedFileName)));
        }
    });

    if (!isDirectoryPickerSupported) {
        return (
            <div className="flex flex-col justify-center items-center">
                <AlertIcon />
                <p>Your Browser does not support the File-System API</p>
            </div>
        )
    }

    if (!directoryHandle) {
        return <button
            type="button"
            className="bg-zinc-500 rounded-md p-1 text-xl"
            onClick={showDirectoryPicker}
            onPointerDown={(e) => e.stopPropagation()}>
            Open Folder
        </button>
    }
    
    plugin.registerHandles(shape.id, {
        directories,
        files
    }, directoryHandle); // Stores the handles in the plugin instance for other plugins to use    


    return <div className="flex justify-center items-center w-full h-full">
        {directoryHandle &&
            <div className="overflow-y-auto w-full max-h-full h-full flex flex-col">
                <p className="m-2 font-bold">{directoryHandle.name}</p>
                <hr></hr>
                <div className="grid grid-cols-5 gap-2 w-full max-h-full h-full">
                    { // TODO add folder grid above file grid
                        files.map((fileHandle) => {
                            // TODO use fileHandle to show preview of e.g. image files
                            const [fileName, fileExtension] = fileHandle.name.split('.') ?? [];
                            const isDetached = !!getDetachedRef(fileHandle);
                            console.log(isDetached);
                            console.log(detachedFiles);
                            
                            
                            return (
                                <div
                                    key={fileHandle.name}
                                    className={`w-12 h-12 rounded-lg m-2  ${isDetached ? 'pointer-events-none bg-zinc-700 animate-ping' : 'bg-zinc-500'}`}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();

                                        /* Creates a shape and adds the file data and source shape (folder) to the meta data
                                        When the file shape collides with another plugin shape, that plugin can use the attached metadata
                                        To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */
                                        const meta: ShapeMeta = {
                                            data: {
                                                files: [{
                                                    name: fileName,
                                                    dir: directoryHandle.name,
                                                    extension: fileExtension,
                                                    sourceShape: shape.id ?? null
                                                }]
                                            },
                                            props: FilePlugin.properties
                                        };
                                        console.log('Creating file shape with meta');
                                        console.log(meta);

                                        const fileShape = editor.createShape({
                                            type: 'rect',
                                            x: e.clientX - 20,
                                            y: e.clientY - 20,
                                            meta,
                                            props: {
                                                w: 100,
                                                h: 125
                                            }
                                        }).getShapeAtPoint({
                                            x: e.clientX,
                                            y: e.clientY,
                                        });

                                        if (fileShape) {
                                            // Attach shape & file to detached files state which also triggers a re-render
                                            setDetachedFiles([...detachedFiles, {
                                                shape: fileShape,
                                                ...meta.data.files![0]
                                            }]);
                                        }

                                    }}
                                >
                                    <p className="text-ellipsis">{fileName}</p>
                                </div>
                            )
                        })}
                </div>
            </div>}
    </div>


}
export default Component;