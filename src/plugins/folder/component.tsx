import { useEffect, useState } from "react";
import { PluginData } from "../base";
import { commonFilters, useFileSystem } from "use-file-system";
import LineMdAlertCircleTwotoneLoop from '~icons/line-md/alert-circle-twotone-loop';
import { TLShape, useEditor } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import filePluginProperties from "../file/properties";

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = (shape: TLShape, data?: PluginData) => {
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
                        const fileName = filePath.split('/').findLast(() => true);
                        return (
                            <div
                                key={filePath}
                                className="w-12 h-12 rounded-sm bg-zinc-500"
                                onDragStart={() => {
                                    console.log(`Drag ${fileName}`);

                                }}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const fileShape = editor.createShape({
                                        type: 'rect',
                                        x: e.clientX - 20,
                                        y: e.clientY - 20,
                                        meta: {
                                            data: {
                                                attachments: [{
                                                    path: filePath,
                                                    type: 'file'
                                                }]
                                            },
                                            props: filePluginProperties
                                        } as ShapeMeta
                                    }).getShapeAtPoint({
                                        x: e.clientX,
                                        y: e.clientY,
                                    });

                                    if (fileShape) {
                                        editor.setSelectedShapes([fileShape]);
                                        editor.setCroppingShape(fileShape)
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