import { useEffect, useState } from "react";
import { FileTypeSchema, PluginData } from "../base";
import { commonFilters, useFileSystem } from "use-file-system";
import LineMdAlertCircleTwotoneLoop from '~icons/line-md/alert-circle-twotone-loop';
import { TLShape, useEditor } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import plugin from "./plugin";
import FilePlugin from "@/plugins/file/plugin";

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = (shape: TLShape, data?: PluginData) => {
    // TODO save all files that were clicked in state and filter them from the displayed list
    const editor = useEditor();
    const { isBrowserSupported, files, onDirectorySelection, handles } = useFileSystem({
        onFilesAdded: (newFiles, previousFiles) => {
            console.log('onFilesAdded', newFiles, previousFiles);
        },
        onFilesChanged: (changedFiles, previousFiles) => {
            console.log('onFilesChanged', changedFiles, previousFiles);
        },
        onFilesDeleted: (deletedFiles, previousFiles) => {
            console.log('onFilesDeleted', deletedFiles, previousFiles);
        },
        filters: commonFilters
    });
    plugin.registerHandles(shape.id, handles); // Stores the handles in the plugin instance for other plugins to use

    // TODO when directory is selected register all handles and files with the plugin logic file
    

    if (!isBrowserSupported) {
        return (
            <div className="flex flex-col justify-center items-center">
                <LineMdAlertCircleTwotoneLoop />
                <p>Your Browser does not support the File-System API</p>
            </div>
        )
    }

    return (
        <>
            {files.size === 0 &&
                <button
                    type="button"
                    className="bg-zinc-400 rounded-md p-1"
                    onClick={onDirectorySelection}
                    onPointerDown={(e) => e.stopPropagation()}>
                    Open Folder
                </button>}

            <div className="overflow-y-auto w-full max-h-full h-full mt-4">
                <div className="grid grid-cols-5 gap-2 w-full max-h-full h-full">
                    {Array.from(files).map(([filePath, fileString]) => {
                        const [fileName, fileType] = filePath.split('/').findLast(() => true)?.split('.') ?? [];
                        return (
                            <div
                                key={filePath}
                                className="w-12 h-12 rounded-sm bg-zinc-500"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const handle = handles.get(filePath);
                                    if(!handle){
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
                                                type: FileTypeSchema.parse(fileType),
                                                sourceShape: shape.id
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
                                        meta
                                    }).getShapeAtPoint({
                                        x: e.clientX,
                                        y: e.clientY,
                                    });

                                    if (fileShape) {
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

        </>
    )
}
export default Component;