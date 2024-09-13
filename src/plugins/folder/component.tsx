import { useCallback, useEffect, useRef, useState } from "react";
import { PluginAttachment, PluginPropsSchema, SerializablePluginPropsSchema, SerializablePluginProps } from "../base";
import { useFileSystem } from "@/hooks/useFileSystem";
import AlertIcon from '~icons/line-md/alert-circle-twotone-loop.jsx';
import { TLArrowShape, TLShape, TLShapeId, useEditor, Vec } from "tldraw";
import plugin, { FolderData } from "./plugin";
import FilePlugin, { FileData } from "@/plugins/file/plugin";
import FolderPlugin from "@/plugins/folder/plugin";
import { MetaPayload, unwrapShape } from "@/util/pluginUtil";
import { DefaultExtensionType, defaultStyles, FileIcon } from "react-file-icon";
import FolderIcon from '~icons/ic/twotone-folder';
import deepEqual from "deep-equal";
import { getArrowCoordinates } from "@/util/collision";
import PlusIcon from '~icons/mdi/plus.jsx';

// TODO attempt to rework folders so that they include files as shapes from the start which are grouped together and the folder just encompasses them all
/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: FolderData }) => {
    const editor = useEditor();

    const [detached, setDetached] = useState<{ shapeId: TLShapeId, attachment: PluginAttachment }[]>([]);
    const [addDirectoryUiEnabled, setAddDirectoryUiEnabled] = useState(false);

    useEffect(() => {
        /* https://tldraw.dev/examples/editor-api/store-events */
        // This reattaches detached files
        const unsubscribeEditor = editor.store.listen(({ changes: { removed } }) => {
            const removedShapes = Object.values(removed);
            if (!removedShapes.length) return;

            const reattachQueue: TLShapeId[] = [];
            for (const { id, typeName } of removedShapes) {
                if (typeName !== 'shape') continue;
                if (detached.find(({ shapeId }) => id === shapeId)) {
                    reattachQueue.push(id as TLShapeId);
                }
            }
            if (!reattachQueue.length) return;

            setDetached(detached.filter(({ shapeId }) => !reattachQueue.includes(shapeId)));
        })


        // Run an interval that extracts files to attached conveyor belts
        const interval = setInterval(() => {
            // Don't act if the folder shape is currently selected
            if (editor.getSelectedShapes().find(({ id }) => id === shape.id)) return;

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
            clearInterval(interval);
            unsubscribeEditor();
        }
    })

    const spawnDirectory = (name: string, coords: { x: number, y: number }) => {
        /* Creates a shape and adds the file data and source shape (folder) to the meta data
                                        When the file shape collides with another plugin shape, that plugin can use the attached metadata
                                        To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */
        const meta: MetaPayload<FolderData> = {
            props: {
                ...plugin.properties,
                pluginDataSchema: null
            },
            [plugin.properties.id]: {
                parentId: shape.id,
                startIn: name
            }
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

        const meta: MetaPayload<FileData> = {
            [FilePlugin.properties.id]: {
                name,
                dir: root,
                extension,
                sourceShape: shape.id
            },
            props: {
                ...FilePlugin.properties,
                pluginDataSchema: null
            }
        };


        const id = ('shape:' + name + '-' + Date.now()) as TLShapeId;

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

    const startInHandle = (data?.startIn && data.parentId) ? plugin.getHandle(data.parentId, data.startIn) : undefined;
    const { files, directories, rootHandle, showDirectoryPicker, isDirectoryPickerSupported } = useFileSystem({
        onChange: (previous, current) => {
            const danglingDetached = detached.filter(({ attachment: { dir, extension, name } }) =>
                !current.files.find(({ name: fullname }) => fullname === `${name}.${extension}`)
                && !current.directories.find(({ name }) => name === dir));


            if (danglingDetached.length) {
                setDetached(detached.filter(({ shapeId }) => !danglingDetached.find(({ shapeId: id }) => id === shapeId)));
                editor.deleteShapes(danglingDetached.map(({ shapeId }) => shapeId));
            }
        },
        onOpen: async (directoryHandle) => {
            // Create and delete file to prompt user permissions
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

    const DirectoryAddUI = ({ }: {}) => {
        const [value, setValue] = useState('New Folder');

        const createDir = async () => {
            await rootHandle.getDirectoryHandle(value, {
                create: true
            });
            setAddDirectoryUiEnabled(false);
        }
        return <div className="flex flex-col justify-center items-center min-w-48 h-auto max-h-52 w-2/5 pb-8">
            <FolderIcon className="w-full h-full" />
            <input
                autoFocus
                className="w-full h-fit text-black text-xl rounded-full px-4 text-ellipsis"
                placeholder="Directory name.."
                onChange={({ currentTarget: { value } }) => {
                    setValue(value);
                }}
                onKeyDown={async ({ code }) => code === 'Enter' && createDir()}
                onBlur={createDir}>
            </input>
        </div>
    }
    return <div className="flex justify-center items-center w-full h-full">
        {rootHandle &&
            <div className="overflow-y-auto w-full h-full flex flex-col justify-start items-center scrollbar-thin scrollbar-track-black scrollbar-thumb-slate-400">
                <p className="m-2 font-bold text-3xl">{rootHandle.name}</p>
                <hr></hr>
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(3rem,_6%))] gap-4 p-4 w-full items-start text-3xl">
                    {[
                        <button key={shape.id + "directoryAddButton"} className={`w-full h-full flex flex-col hover:brightness-110 hover:scale-110 disabled:opacity-50  transition-all duration-100`} disabled={addDirectoryUiEnabled} onPointerDown={(e) => e.stopPropagation()} onClick={() => {
                            setAddDirectoryUiEnabled(true);
                        }}>
                            <div className="w-full h-auto bg-zinc-500  rounded-lg flex justify-center items-center">
                                <PlusIcon className="w-full h-auto my-auto py-1" />

                            </div>
                        </button>,
                        ...directories.map((directoryHandle) => {
                            // TODO use fileHandle to show preview of e.g. image files
                            const isDirectoryDetached = !!detached.find(({ attachment: { dir } }) => dir === directoryHandle.name);

                            return (
                                <div
                                    key={directoryHandle.name}
                                    title={directoryHandle.name}
                                    className={`w-full h-full flex flex-col hover:scale-110 hover:brightness-110 transition-all duration-100 ${isDirectoryDetached && 'pointer-events-none opacity-20'}`}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();

                                        const coords = editor.screenToPage({ x: e.pageX, y: e.pageY });
                                        spawnDirectory(directoryHandle.name, coords);

                                    }}
                                >
                                    <FolderIcon className="w-full h-full  rounded-xl bg-zinc-500" />
                                    <p className="text-nowrap text-ellipsis overflow-hidden pb-4 text-lg">{directoryHandle.name}</p>
                                </div>
                            )
                        })
                    ]}
                </div>
                {addDirectoryUiEnabled && <DirectoryAddUI key={shape.id + 'directoryadd'} />}
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(4rem,_10%))] gap-4 p-4 w-full items-start text-3xl">
                    {[
                        ...files.filter(({ name: fullname }) => !detached.find(({ attachment: { name, extension } }) => fullname === `${name}.${extension}`)).map((fileHandle, i) => {
                            // TODO use fileHandle to show preview of e.g. image files
                            const [name, extension] = fileHandle.name.split('.') ?? [];
                            //const isFileDetached = !!isDetached(fileHandle);

                            return (
                                <div
                                    key={name + '-' + i + '-' + shape.id}
                                    title={name + '.' + extension}
                                    className={`w-full h-full hover:scale-110 hover:brightness-110  transition-all duration-100`}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();

                                        const coords = editor.screenToPage({ x: e.pageX, y: e.pageY });
                                        spawnFile(name, extension, rootHandle.name, coords);
                                    }}
                                >
                                    <FileIcon extension={name} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} />
                                </div>
                            )
                        })
                    ]}
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(1rem,_6%))] gap-4 p-4 w-full items-start text-3xl mt-auto">
                    {[

                        ...detached.filter(({ attachment: { name } }) => !!name).map(({ shapeId, attachment: { extension, name } }) => {
                            return <div
                                key={name + '-' + shapeId}
                                className={`w-full h-full pointer-events-none opacity-20`}
                            >
                                <FileIcon extension={name} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} />
                            </div>;
                        })
                    ]}
                </div>
            </div>}
    </div>


}
export default Component;