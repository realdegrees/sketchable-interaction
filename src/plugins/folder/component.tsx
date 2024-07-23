import { useCallback, useEffect, useState } from "react";
import { PluginData, PluginFile } from "../base";
import { useFileSystem } from "@/hooks/useFileSystem";
import { commonFilters } from "@/hooks/filters";
import LineMdAlertCircleTwotoneLoop from '~icons/line-md/alert-circle-twotone-loop';
import { TLShape, TLShapeId, useEditor } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import plugin from "./plugin";
import FilePlugin from "@/plugins/file/plugin";
import { unwrapShape } from "@/util/pluginUtil";
import { lookup } from "mime-types";

// TODO attempt to rework folders so that they include files as shapes from the start which are grouped together and the folder just encompasses them all
/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    const editor = useEditor();
    const [detachedFiles, setDetachedFiles] = useState<(PluginFile & { shape: TLShape })[]>([]);
    const [rerenderState, triggerRerender] = useState<boolean>();

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

    // TODO save all files that were clicked in state and filter them from the displayed list (or grey them out and make them non-clickable)
    const { isBrowserSupported, onDirectorySelection, handles, directoryHandle } = useFileSystem({
        onFilesAdded: (newFiles, previousFiles) => {
            console.log('files added');

            triggerRerender(!rerenderState);
            // console.log('onFilesAdded', newFiles, previousFiles);
        },
        onFilesChanged: (changedFiles, previousFiles) => {
            triggerRerender(!rerenderState);
            // console.log('onFilesChanged', changedFiles, previousFiles);
        },
        onFilesDeleted: (deletedFiles, previousFiles) => {
            // Retrieve the keys (paths) of the deleted files
            const deletedFilesKeys = Array.from(deletedFiles.keys());

            // find all detachedFiles that were deleted
            const deletedDetachedFiles = detachedFiles.filter(({ fullPath }) => deletedFilesKeys.includes(fullPath));

            // delete the shapes of all detachedFiles that were deleted
            deletedDetachedFiles.forEach(({ shape }) => {
                editor.deleteShape(shape);
            })

            console.log('File deleted');

            // update the detachedFiles state and trigger re-render
            setDetachedFiles(detachedFiles.filter(({ fullPath }) => !deletedFilesKeys.includes(fullPath)))
        },
        filters: commonFilters
    });
    plugin.registerHandles(shape.id, handles, directoryHandle); // Stores the handles in the plugin instance for other plugins to use    


    if (!isBrowserSupported) {
        return (
            <div className="flex flex-col justify-center items-center">
                <LineMdAlertCircleTwotoneLoop />
                <p>Your Browser does not support the File-System API</p>
            </div>
        )
    }

    return <div className="flex justify-center items-center w-full h-full">
        {directoryHandle ?
            <div className="overflow-y-auto w-full max-h-full h-full flex flex-col">
                <p className="m-2 font-bold">{directoryHandle.name}</p>
                <hr></hr>
                <div className="grid grid-cols-5 gap-2 w-full max-h-full h-full">
                    {Array.from(handles.entries()).map(([filePath, fileHandle]) => {
                        // TODO use fileHandle to show preview of e.g. image files
                        const [fileName, fileExtension] = filePath.split('/').findLast(() => true)?.split('.') ?? [];
                        const mimeType = lookup(fileExtension);
                        return (
                            <div
                                key={filePath}
                                className={`w-12 h-12 rounded-lg m-2  ${detachedFiles.find(({ fullPath }) => fullPath === filePath) ? 'pointer-events-none bg-zinc-700 animate-ping' : 'bg-zinc-500'}`}
                                onPointerDown={(e) => {
                                    e.stopPropagation();

                                    if (!mimeType) {
                                        alert('Unable to determine file type, cannot handle this file!');
                                        return;
                                    }

                                    const handle = handles.get(filePath);
                                    if (!handle) {
                                        console.warn(`Unable to get handle for file ${fileName}`);
                                        return;
                                    }

                                    /* Creates a shape and adds the file data and source shape (folder) to the meta data
                                    When the file shape collides with another plugin shape, that plugin can use the attached metadata
                                    To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */
                                    const meta: ShapeMeta = {
                                        data: {
                                            files: [{
                                                name: fileName,
                                                fullPath: filePath,
                                                extension: fileExtension,
                                                mimeType,
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
                                            h: 100
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
                                        console.log(fileShape);
                                    }

                                }}
                            >
                                <p className="text-ellipsis">{fileName}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
            : <button
                type="button"
                className="bg-zinc-500 rounded-md p-1 text-xl"
                onClick={onDirectorySelection}
                onPointerDown={(e) => e.stopPropagation()}>
                Open Folder
            </button>}
    </div>


}
export default Component;