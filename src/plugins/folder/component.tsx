import { useEffect, useState } from "react";
import { PluginData } from "../base";
import { commonFilters, useFileSystem } from "use-file-system";
import LineMdAlertCircleTwotoneLoop from '~icons/line-md/alert-circle-twotone-loop';
import { TLShape, useEditor } from "tldraw";

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

            <div className="overflow-y-auto w-full max-h-full h-full">
                <div className="grid col-auto w-full max-h-full h-full">
                {Array.from(files).map(([filePath, fileString]) => {
                    const fileName = filePath.split('/').findLast(() => true);
                    return (
                        <div key={filePath} className="w-12 h-12 rounded-sm bg-zinc-500">
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