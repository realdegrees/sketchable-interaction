import { useCallback, useEffect, useRef, useState } from "react";
import { PluginData, PluginAttachment } from "../base";
import { useFileSystem } from "@/hooks/useFileSystem";
import AlertIcon from '~icons/line-md/alert-circle-twotone-loop';
import { TLArrowShape, TLShape, TLShapeId, useEditor, Vec } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import plugin from "./plugin";
import FilePlugin from "@/plugins/file/plugin";
import FolderPlugin from "@/plugins/folder/plugin";
import { unwrapShape } from "@/util/pluginUtil";
import { DefaultExtensionType, defaultStyles, FileIcon } from "react-file-icon";
import FolderIcon from '~icons/ic/twotone-folder.jsx';
import deepEqual from "deep-equal";
import { getArrowCoordinates } from "@/util/collision";

// TODO attempt to rework folders so that they include files as shapes from the start which are grouped together and the folder just encompasses them all
/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    const editor = useEditor();

    const [detached, setDetached] = useState<{ shapeId: TLShapeId, attachment: PluginAttachment }[]>([]);

    useEffect(() => {
        /* https://tldraw.dev/examples/editor-api/store-events */
        // This reattaches detached files
        const unsubscribeEditor = editor.store.listen(({ changes: { removed } }) => {
            const reattachQueue: TLShapeId[] = [];
            for (const { id, typeName } of Object.values(removed)) {  
                if(typeName !== 'shape') continue;              
                if(detached.find(({shapeId}) => id === shapeId)){
                    reattachQueue.push(id as TLShapeId);
                }
            }
            if(reattachQueue.length === 0) return;
            
            setDetached(detached.filter(({ shapeId }) => !reattachQueue.includes(shapeId)));
        })

        
        // Run an interval that extracts files to attached conveyor belts
        const interval = setInterval(() => {
            // Don't act if the folder shape is currently selected
            if(editor.getSelectedShapes().find(({id}) => id === shape.id)) return;

            const connectedConveyors = editor.getArrowsBoundTo(shape.id).map(({ arrowId, handleId }) => {
                if (handleId !== 'start') return;
                const shape: TLArrowShape = editor.getShape(arrowId) as TLArrowShape;
                if (shape?.isLocked) return;
                const { plugin } = unwrapShape(shape) ?? {};
                return plugin?.id === 'conveyor' ? shape : undefined;
            }).filter((shape): shape is TLArrowShape => !!shape);

            if (!connectedConveyors[0] || !rootHandle) return;
            const { coords: [{ x, y }], origin } = getArrowCoordinates(connectedConveyors[0], editor);
            const coords = Vec.Add(origin, { x, y });

            const file = files.find((file) => {
                const [name, extension] = file.name.split('.') ?? [];
                if (!detached.find(({ attachment }) => name === attachment.name && extension === attachment.extension)) {
                    return file;
                }
            });
            if (!file) return;

            const [name, extension] = file.name.split('.') ?? [];

            console.log('Spawning file ' + name);

            spawnFile(name, extension, rootHandle.name, coords);
        }, 1000);

        return () => {            
            unsubscribeEditor();
            clearInterval(interval);
        }
    })

    const spawnDirectory = (name: string, coords: { x: number, y: number }) => {
        /* Creates a shape and adds the file data and source shape (folder) to the meta data
                                        When the file shape collides with another plugin shape, that plugin can use the attached metadata
                                        To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */
        const meta: ShapeMeta = {
            data: {
                attachments: [{
                    name: name,
                    dir: name,
                    sourceShape: shape.id ?? null
                }],
                state: { activeEffects: [] }
            },
            props: plugin.properties
        };

        const id = ('shape:' + Date.now() + name) as TLShapeId;
        const { x, y, props } = editor.getShape(shape) ?? { x: coords.x, y: coords.y, props: { w: 0 } };
        const w = ('w' in props && props.w) || 0;

        const dirShape = editor.createShape({
            id,
            type: 'rect',
            x: x + w,
            y,
            meta,
            props: {
                w: 200,
                h: 200
            }
        }).getShape(id);

        if (dirShape) {
            plugin?.connectShape(shape.id, dirShape.id, editor, true);

            setDetached([
                ...detached,
                {
                    shapeId: dirShape.id,
                    attachment: {
                        dir: name,
                        sourceShape: shape.id
                    }
                }
            ]);

            // FolderPlugin.addDetachedItem(shape.id, dirShape.id, {
            //     dir: directoryHandle.name,
            //     sourceShape: dirShape.id
            // })
        }
    }
    const spawnFile = (name: string, extension: string, root: string, coords: { x: number, y: number }) => {
        /* Creates a shape and adds the file data and source shape (folder) to the meta data
                                                When the file shape collides with another plugin shape, that plugin can use the attached metadata
                                                To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */
        const meta: ShapeMeta = {
            data: {
                attachments: [{
                    name,
                    dir: root,
                    extension,
                    sourceShape: shape.id ?? null
                }],
                state: { activeEffects: [] }
            },
            props: FilePlugin.properties
        };


        const id = ('shape:' + Date.now() + name) as TLShapeId;

        const fileShape = editor.createShape({
            id,
            type: 'rect',
            x: coords.x - 50,
            y: coords.y - 62.5,
            meta,
            props: {
                w: 100,
                h: 125
            }
        }).getShape(id);

        if (fileShape) {
            plugin?.connectShape(shape.id, fileShape.id, editor, true);

            setDetached([
                ...detached,
                {
                    shapeId: fileShape.id,
                    attachment: {
                        dir: root,
                        name,
                        extension,
                        sourceShape: shape.id
                    }
                }
            ]);
        }
    };

    const startInHandle = data?.attachments?.[0].dir ? plugin.getHandle(data.attachments[0].sourceShape, data.attachments[0].dir) : undefined;
    const { files, directories, rootHandle, showDirectoryPicker, isDirectoryPickerSupported } = useFileSystem({
        onChange: (previous, current) => {
        },
        onOpen: async (directoryHandle) => {
            const newFileHandle = await directoryHandle.getFileHandle(
                `si-temp`,
                {
                    create: true,
                }
            );

            const writeable = await newFileHandle.createWritable();
            await writeable.write('1');
            await writeable.close();
            await directoryHandle.removeEntry(`si-temp`);
        },
        ignorePattern: /^si-temp(\.crswap)?$/,
        startIn: startInHandle,
        pollInterval: 500
    });

    if (!isDirectoryPickerSupported) {
        return (
            <div className="flex flex-col justify-center items-center">
                <AlertIcon />
                <p>Your Browser does not support the File-System API</p>
            </div>
        )
    }

    if (!rootHandle) {
        return <button
            type="button"
            className="bg-zinc-500 rounded-md p-1 text-xl"
            onClick={async () => {
                await showDirectoryPicker?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}>
            Open Folder
        </button>
    }

    // TODO instead of registering handles to the folder plugin, register them to the shapes that are created from folders (saved within either folder or file plugin)
    plugin.registerHandles(shape.id, {
        directories,
        files
    }, rootHandle); // Stores the handles in the plugin instance for other plugins to use    

    return <div className="flex justify-center items-center w-full h-full">
        {rootHandle &&
            <div className="overflow-y-auto w-full h-full flex flex-col">
                <p className="m-2 font-bold">{rootHandle.name}</p>
                <hr></hr>
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(4rem,_1fr))] gap-2 p-2 w-full items-start">
                    {[
                        ...directories.map((directoryHandle) => {
                            // TODO use fileHandle to show preview of e.g. image files
                            const isDirectoryDetached = !!detached.find(({ attachment: { dir } }) => dir === directoryHandle.name);

                            return (
                                <div
                                    key={directoryHandle.name}
                                    className={`max-w-14 max-h-14 rounded-lg bg-zinc-500 ${isDirectoryDetached && 'pointer-events-none opacity-20'}`}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();

                                        spawnDirectory(directoryHandle.name, { x: e.pageX, y: e.pageY });

                                    }}
                                >
                                    <FolderIcon className="w-full h-full" />
                                    <p className="text-center">{directoryHandle.name}</p>
                                </div>
                            )
                        }),
                        detached.filter(({ attachment: { name } }) => !!name).map(({ shapeId, attachment: { extension, name } }) => {
                            return <div
                                key={name + '-' + shapeId}
                                className={`w-16 max-h-fit pointer-events-none opacity-20`}
                            >
                                <FileIcon extension={name} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} />
                            </div>;
                        }),
                        ...files.filter(({ name: fullname }) => !detached.find(({ attachment: { name, extension } }) => fullname === `${name}.${extension}`)).map((fileHandle, i) => {
                            // TODO use fileHandle to show preview of e.g. image files
                            const [name, extension] = fileHandle.name.split('.') ?? [];
                            //const isFileDetached = !!isDetached(fileHandle);

                            return (
                                <div
                                    key={name + '-' + i}
                                    className={`w-16 max-h-fit `}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();

                                        spawnFile(name, extension, rootHandle.name, { x: e.pageX, y: e.pageY });
                                    }}
                                >
                                    <FileIcon extension={name} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} />
                                </div>
                            )
                        }),
                        <div key="directoryAddButton" className={`w-16 h-18 rounded-lg bg-zinc-500 hover:brightness-110 hover:scale-110}`}></div>
                    ]}
                </div>
            </div>}
    </div>


}
export default Component;