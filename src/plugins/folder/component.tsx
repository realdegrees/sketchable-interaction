import { useCallback, useEffect, useState } from "react";
import { PluginData, PluginAttachment } from "../base";
import { useFileSystem } from "@/hooks/useFileSystem";
import AlertIcon from '~icons/line-md/alert-circle-twotone-loop';
import { TLShape, TLShapeId, useEditor } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import plugin from "./plugin";
import FilePlugin from "@/plugins/file/plugin";
import FolderPlugin from "@/plugins/folder/plugin";
import { unwrapShape } from "@/util/pluginUtil";
import { DefaultExtensionType, defaultStyles, FileIcon } from "react-file-icon";
import FolderIcon from '~icons/ic/twotone-folder.jsx';
import deepEqual from "deep-equal";
import { map } from "zod";

// TODO attempt to rework folders so that they include files as shapes from the start which are grouped together and the folder just encompasses them all
/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    const editor = useEditor();
    const [detachedMap, setDetachedMap] = useState<Map<TLShapeId, PluginAttachment>>(new Map());

    const isDetached = (attachment: FileSystemHandle) => {
        return Array.from(detachedMap.values() ?? []).find(({ name, extension }) => {
            return attachment.kind === 'directory'
                ? name === attachment.name
                : [name, extension].join('.') === attachment.name
        });
    };

    const startInHandle = data?.attachments?.[0].dir ? plugin.getHandle(data.attachments[0].sourceShape, data.attachments[0].dir) : undefined;
    const { files, directories, rootHandle, showDirectoryPicker, isDirectoryPickerSupported } = useFileSystem({
        onChange: (previous, current) => {
            console.log('File change');
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
    const detached = new Map(Array.from(FilePlugin.activeShapes.values())
        .map((shapeId) => {
            const shape = editor.getShape(shapeId);
            const { data } = unwrapShape(shape) ?? {};

            return [
                shape?.id,
                data?.attachments?.[0]
            ];
        })
        .filter((entry): entry is [TLShapeId, PluginAttachment] => !!entry[0] && !!entry[1])
        .filter(([, { sourceShape }]) => sourceShape === shape.id));


    if (!deepEqual(detachedMap, detached)) {
        setDetachedMap(detached);
    }
    FolderPlugin.setDetachedItems(shape.id, detached);

    // useEffect(() => {
    //     const detached = Array.from(FilePlugin.activeShapes.values())
    //         .map((shapeId) => {
    //             const shape = editor.getShape(shapeId);
    //             const { data } = unwrapShape(shape) ?? {};

    //             return {
    //                 shape,
    //                 ...data?.attachments?.[0]
    //             };
    //         })
    //         .filter((file): file is PluginAttachment & { shape: TLShape } => !!shape.id)
    //         .filter(({ sourceShape }) => sourceShape === shape.id);
    //     setDetachedFiles(detached);

    // }, [setDetachedFiles, editor, shape.id])

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

                console.log(rootHandle);


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
                            const isDirectoryDetached = !!isDetached(directoryHandle);

                            return (
                                <div
                                    key={directoryHandle.name}
                                    className={`max-w-14 max-h-14 rounded-lg bg-zinc-500 ${isDirectoryDetached && 'pointer-events-none opacity-20'}`}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();

                                        /* Creates a shape and adds the file data and source shape (folder) to the meta data
                                        When the file shape collides with another plugin shape, that plugin can use the attached metadata
                                        To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */
                                        const meta: ShapeMeta = {
                                            data: {
                                                attachments: [{
                                                    name: directoryHandle.name,
                                                    dir: directoryHandle.name,
                                                    sourceShape: shape.id ?? null
                                                }],
                                                state: { activeEffects: [] }
                                            },
                                            props: plugin.properties
                                        };
                                        console.log('Creating folder shape with meta');

                                        const id = ('shape:' + Date.now() + directoryHandle.name) as TLShapeId;
                                        const { x, y, props } = editor.getShape(shape) ?? { x: e.pageX, y: e.pageY, props: { w: 0 } };
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
                         
                                            setDetachedMap(new Map([...Array.from(detachedMap.entries()), [dirShape.id, {
                                                dir: directoryHandle.name,
                                                sourceShape: dirShape.id
                                            }]]));
                                            // FolderPlugin.addDetachedItem(shape.id, dirShape.id, {
                                            //     dir: directoryHandle.name,
                                            //     sourceShape: dirShape.id
                                            // })
                                        }

                                    }}
                                >
                                    <FolderIcon className="w-full h-full" />
                                    <p className="text-center">{directoryHandle.name}</p>
                                </div>
                            )
                        }),
                        ...Array.from(detachedMap.entries()).map(([detachedShapeId, { dir, sourceShape, extension, name }]) => {
                            return <div
                                key={name + '-' + detachedShapeId}
                                className={`w-16 max-h-fit pointer-events-none opacity-20`}
                            >
                                <FileIcon extension={name} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} />
                            </div>;
                        })
                        ,
                        ...files.filter((file) => !Array.from(detachedMap.values()).find(({ name, extension }) => `${name}.${extension}` === file.name)).map((fileHandle, i) => {
                            // TODO use fileHandle to show preview of e.g. image files
                            const [name, extension] = fileHandle.name.split('.') ?? [];
                            //const isFileDetached = !!isDetached(fileHandle);

                            return (
                                <div
                                    key={name + '-' + i}
                                    className={`w-16 max-h-fit `}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();

                                        /* Creates a shape and adds the file data and source shape (folder) to the meta data
                                        When the file shape collides with another plugin shape, that plugin can use the attached metadata
                                        To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */
                                        const meta: ShapeMeta = {
                                            data: {
                                                attachments: [{
                                                    name,
                                                    dir: rootHandle.name,
                                                    extension,
                                                    sourceShape: shape.id ?? null
                                                }],
                                                state: { activeEffects: [] }
                                            },
                                            props: FilePlugin.properties
                                        };
                                        console.log('Creating file shape with meta');
                                        console.log(meta);

                                        const { x, y, props } = editor.getShape(shape) ?? { x: e.pageX, y: e.pageY, props: { w: 0 } };
                                        const w = ('w' in props && props.w) || 0;
                                        const id = ('shape:' + Date.now() + name + '-' + i) as TLShapeId;

                                        const fileShape = editor.createShape({
                                            id,
                                            type: 'rect',
                                            x: x + w,
                                            y,
                                            meta,
                                            props: {
                                                w: 100,
                                                h: 125
                                            }
                                        }).getShape(id);

                                        if (fileShape) {
                                            plugin?.connectShape(shape.id, fileShape.id, editor, true);
                                            setDetachedMap(new Map([...Array.from(detachedMap.entries()), [fileShape.id, {
                                                dir: rootHandle.name,
                                                sourceShape: fileShape.id,
                                                name,
                                                extension
                                            }]]));
                                        }

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