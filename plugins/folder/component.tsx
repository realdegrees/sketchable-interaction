import { useCallback, useEffect, useRef, useState } from "react";
import { useFileSystem } from "@/hooks/useFileSystem";
import AlertIcon from '~icons/mdi/progress-alert.jsx';
import { TLArrowShape, TLShape, TLShapeId, useEditor, Vec } from "tldraw";
import FolderPlugin from "./plugin";
import { MetaPayload, PluginUtil } from "@/util/pluginUtil";
import { DefaultExtensionType, defaultStyles, FileIcon } from "react-file-icon";
import FolderIcon from '~icons/mdi/folder.jsx';
import { getArrowCoordinates } from "@/util/collision";
import PlusIcon from '~icons/mdi/plus.jsx';
import { COLORS } from "@/util/constants";
import { PluginComponent, usePluginStore } from "@/stores/plugin";
import { FolderData } from "./config";
import { FileData } from "../file/config";
import SimpleFileIcon from '~icons/mdi/file-outline.jsx';

export type SpawnFileArgs = { name: string, extension: string, coords: { x: number, y: number }, options?: { selectOnSpawn?: boolean, w?: number, h?: number, id?: TLShapeId } };
type DetachedItem = { shapeId: TLShapeId, attachment: FileData };
const Component: PluginComponent<FolderData, FolderPlugin> = ({ shape, data, plugin }) => {
    const editor = useEditor();

    const [detached, setDetached] = useState<DetachedItem[]>([]);
    const [addDirectoryUiEnabled, setAddDirectoryUiEnabled] = useState(false);
    const [addFileUiEnabled, setAddFileUiEnabled] = useState(false);
    const color = useRef<string>(COLORS[Math.floor(Math.random() * (COLORS.length - 1))]);
    const { getPluginConfig } = usePluginStore();
    const startIn = useRef(data?.startIn);

    const startInDirectoryHandle = data?.parentId && startIn ? PluginUtil.getPlugin<FolderPlugin>(data.parentId)?.handles?.directories.find(({ name }) => name === startIn.current) : undefined;
    const { files, directories, rootHandle, showDirectoryPicker, isDirectoryPickerSupported } = useFileSystem({
        onOpen: async ({ directories, files, rootHandle }) => {

            // Create and delete file to prompt user permissions
            const newFileHandle = await rootHandle.getFileHandle(
                `si-temp`,
                {
                    create: true,
                }
            );

            const writeable = await newFileHandle.createWritable();
            await writeable.write('1');
            await writeable.close();
            await rootHandle.removeEntry(`si-temp`);
        },
        onChange: (_, current) => {
            const danglingDetached = detached.filter(({ attachment: { dir, extension, name } }) =>
                !current.files.find(({ name: fullname }) => fullname === `${name}.${extension}`)
                && !current.directories.find(({ name }) => name === dir));



            if (danglingDetached.length) {
                setDetached(detached.filter(({ shapeId }) => !danglingDetached.find(({ shapeId: id }) => id === shapeId)));
                editor.deleteShapes(danglingDetached.map(({ shapeId }) => shapeId));
            }
        },
        ignorePattern: /^(si-temp|\.crswap|.*\.crswap)$/,
        startIn: startInDirectoryHandle,
        pollInterval: 500
    });

    const spawnDirectory = (name: string, coords: { x: number, y: number }, options?: { selectOnSpawn?: boolean }) => {
        /* Creates a shape and adds the file data and source shape (folder) to the meta data
        When the file shape collides with another plugin shape, that plugin can use the attached metadata
        To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */

        const folderPluginConfig = getPluginConfig('folder', { pluginDataSchema: null });

        if (!folderPluginConfig) {
            console.warn(`Unable to spawn directory due to missing config!`);
            return;
        }

        const meta = {
            [folderPluginConfig.id ?? 'folder']: {
                parentId: shape.id,
                startIn: name
            },
            config: { ...folderPluginConfig, pluginDataSchema: null }
        } as MetaPayload<FolderData>;

        const id = ('shape:' + Date.now() + name) as TLShapeId;
        const { x, y, props } = editor.getShape(shape) ?? { x: coords.x, y: coords.y, props: { w: 0 } };
        const w = ('w' in props && props.w) || 0;

        editor.createShape({
            id,
            type: 'rect',
            x: x + w,
            y,
            meta,
            props: {
                w: 500,
                h: 500
            }
        });

        plugin?.connectShape(id, true);
        options?.selectOnSpawn && editor.setSelectedShapes([id]);
        setDetached([
            ...detached,
            {
                shapeId: id,
                attachment: {
                    dir: name,
                    sourceShape: shape.id
                }
            }
        ]);
    }
    const spawnFile = useCallback((args: SpawnFileArgs): TLShapeId | undefined => {
        if (!rootHandle) {
            plugin?.emit('filespawncallback');
            return;
        }

        const { coords, options, extension, name } = args;

        /* Creates a shape and adds the file data and source shape (folder) to the meta data
        When the file shape collides with another plugin shape, that plugin can use the attached metadata
        To retrieve the corresponding FileSystemHandle from the folder plugin and manipulate it accordingly */
        const filePluginConfig = getPluginConfig('file', { pluginDataSchema: null });
        const meta = {
            ['file']: {
                name,
                dir: rootHandle.name,
                extension: extension ?? null,
                sourceShape: shape.id
            },
            config: { ...filePluginConfig, pluginDataSchema: null }
        } as MetaPayload<FileData>;

        const id = options?.id ?? ('shape:' + name + '-' + Date.now()) as TLShapeId;
        editor.createShape({
            id,
            type: 'rect',
            x: coords.x - 50,
            y: coords.y - 62.5,
            meta,
            props: {
                w: options?.w ?? 100,
                h: options?.h ?? 125
            }
        });

        plugin?.connectShape(id, true);
        options?.selectOnSpawn && editor.setSelectedShapes([id]);

        setDetached([
            ...detached,
            {
                shapeId: id,
                attachment: {
                    dir: rootHandle.name,
                    name,
                    extension,
                    sourceShape: shape.id
                }
            }
        ]);

        plugin?.emit('filespawncallback', id);
        return id;
    }, [detached, editor, shape, plugin, getPluginConfig, rootHandle]);



    useEffect(() => {
        rootHandle && plugin?.registerHandles({ directories, files }, rootHandle)
        startIn.current = rootHandle?.name;
        // data && plugin?.saveDataToShape({
        //     ...data,
        //     startIn: startIn.current
        // })


        /* https://tldraw.dev/examples/editor-api/store-events */
        // This reattaches detached files
        const unsubscribeEditor = editor.store.listen(({ changes: { removed, added } }) => {
            const removedShapes = Object.values(removed).filter(({ typeName }) => typeName === 'shape');
            const addedShapes = Object.values(added).filter(({ typeName, meta }) => typeName === 'shape' && 'file' in meta).map((s) => ({
                id: s.id,
                data: PluginUtil.unwrapShape<FileData>(s as TLShape)?.data
            }));
            if (!removedShapes.length && !addedShapes.length) return;

            const reattachQueue: TLShapeId[] = [];
            for (const { id } of removedShapes) {
                if (detached.find(({ shapeId }) => id === shapeId)) {
                    reattachQueue.push(id as TLShapeId);
                    plugin?.disconnectShape(id as TLShapeId);
                }
            }
            const onCanvas: DetachedItem[] = []
            for (const { id, data } of addedShapes) {
                if (data?.sourceShape === shape.id && !detached.find(({ shapeId }) => id === shapeId)) {
                    onCanvas.push({
                        shapeId: id as TLShapeId,
                        attachment: data
                    })
                }
            }

            // No need for a state update if nothing changed
            if (!reattachQueue.length && !onCanvas.length) return;

            setDetached([...detached.filter(({ shapeId }) => !reattachQueue.includes(shapeId)), ...onCanvas]);
        })

        const pluginSpawnFileSubscription = plugin?.on<{ connectedConveyorId?: TLShapeId }>('spawnFile', (data) => {
            const connectedConveyor = data?.connectedConveyorId && (editor.getShape(data.connectedConveyorId) as TLArrowShape);
            if (!connectedConveyor || !rootHandle) return;
            const { coords: [{ x, y }], origin } = getArrowCoordinates(connectedConveyor, editor);
            const coords = Vec.Add(origin, { x, y });
            const { plugin: conveyorPlugin } = PluginUtil.unwrapShape(connectedConveyor) ?? {};

            const file = files.find((file) => {
                const name = file.name.split('.').slice(0, file.name.includes('.') ? -1 : 0).join('.');
                const extension = file.name.split('.').pop();

                if (!detached.find(({ attachment }) => name === attachment.name && extension === attachment.extension)) {
                    return file;
                }
            });
            if (!file) return;

            const name = file.name.split('.').slice(0, file.name.includes('.') ? -1 : 0).join('.');
            const extension = file.name.split('.').pop();

            const spawnedShapeId = extension && spawnFile({ name, extension, coords });
            spawnedShapeId && conveyorPlugin?.connectShape(spawnedShapeId);
        });
        const externalFileSpawnSubscription = plugin?.on<SpawnFileArgs>('spawnfile', (args) => {
            args && spawnFile(args);
        });

        return () => {
            pluginSpawnFileSubscription?.();
            externalFileSpawnSubscription?.();
            unsubscribeEditor();
            if (!editor.getShape(shape.id)) {
                detached.forEach(({ shapeId }) => editor.deleteShape(shapeId));
            }
        }
    }, [detached, editor, files, rootHandle, shape, spawnFile, plugin, directories])


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
    const FileAddUI = ({ }: {}) => {
        const [value, setValue] = useState('New File');
        const [warning, setWarning] = useState<string | undefined>(undefined);

        const createFile = async () => {
            let exists: FileSystemFileHandle | undefined;
            try {
                exists = await rootHandle.getFileHandle(value, {
                    create: false
                });
            } catch (e) { }

            if (exists) {
                setWarning('Filename already exists!');
            } else {
                await rootHandle.getFileHandle(value, {
                    create: true
                });
                setWarning(undefined);
            }
            setAddFileUiEnabled(false);
        }
        return <div className="flex flex-col justify-center items-center min-w-48 h-auto max-h-52 w-2/5 pb-8">
            <SimpleFileIcon className="w-full h-full" />
            <input
                autoFocus
                className="w-full h-fit text-black text-xl rounded-full px-4 text-ellipsis"
                placeholder="File name.."
                onChange={({ currentTarget: { value } }) => {
                    setValue(value);
                    setWarning(undefined);
                }}
                onKeyDown={async ({ code }) => code === 'Enter' && createFile()}
                onBlur={createFile}>
            </input>
            {warning && <p className="text-red-600 text-lg">{warning}</p>}
        </div>
    }
    const FileComponent = ({ fileHandle }: { fileHandle: FileSystemFileHandle }) => {
        const name = fileHandle.name.split('.').slice(0, fileHandle.name.includes('.') ? -1 : 0).join('.');
        const extension = fileHandle.name.split('.').pop();

        //const isFileDetached = !!isDetached(fileHandle);

        return (
            <div
                title={name + '.' + extension}
                className={`w-full h-fit hover:scale-110 hover:brightness-110  transition-all duration-100`}
                onPointerDown={(e) => {
                    e.stopPropagation();

                    const coords = editor.screenToPage({ x: e.pageX, y: e.pageY });
                    extension && spawnFile({ name, extension, coords, options: { selectOnSpawn: true } });
                }
                }
            >
                <FileIcon extension={name} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} />
            </div >
        )
    }
    const FolderComponent = ({ directoryHandle }: { directoryHandle: FileSystemDirectoryHandle }) => {
        const [isDetached, setIsDetached] = useState(detached.find(({ attachment: { dir } }) => dir === directoryHandle.name));

        useEffect(() => {
            setIsDetached(detached.find(({ attachment: { dir } }) => dir === directoryHandle.name));
        }, [directoryHandle.name])
        return (
            <div
                key={directoryHandle.name}
                title={directoryHandle.name}
                className={`w-full h-2/3 flex flex-col hover:scale-110 hover:brightness-110 transition-all duration-100 ${isDetached && 'pointer-events-none opacity-20'}`}
                onPointerDown={(e) => {
                    e.stopPropagation();

                    const coords = editor.screenToPage({ x: e.pageX, y: e.pageY });
                    spawnDirectory(directoryHandle.name, coords);

                }}
            >
                <FolderIcon className="w-full h-full  rounded-lg bg-zinc-500" />
                <p className="text-nowrap text-ellipsis overflow-hidden text-center text-sm">{directoryHandle.name}</p>
            </div>
        )
    }
    return <div className="flex justify-center items-center w-full h-full">
        {rootHandle &&
            <div className="overflow-y-auto w-full h-full flex flex-col justify-start items-center">
                <p className="m-2 font-bold text-3xl">{rootHandle.name}</p>
                <hr className={`w-full min-h-1 bg-${color.current}-500`}></hr>
                {<p className="text-start w-full p-2 pb-0 font-bold">Folders</p>}
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(4rem,_10%))] gap-2 p-4 w-full h-fit items-start text-3xl auto-rows-min">
                    {[
                        // ! Add Directory Button
                        <button key={shape.id + "directoryAddButton"} className={`w-full h-2/3 flex flex-col hover:brightness-110 hover:scale-110 disabled:opacity-50  transition-all duration-100`} disabled={addDirectoryUiEnabled} onPointerDown={(e) => e.stopPropagation()} onClick={() => {
                            setAddDirectoryUiEnabled(true);
                        }}>
                            <div className="w-full h-full bg-zinc-500 rounded-lg flex justify-center items-center">
                                <PlusIcon className="w-full h-full my-auto py-1" />

                            </div>
                        </button>,
                        // ! Directory UI
                        ...directories.map((directoryHandle, i) => <FolderComponent directoryHandle={directoryHandle} key={`${directoryHandle.name}-${i}-${shape.id}`} />)
                    ]}
                </div>
                {
                    // ! Add Directory UI
                    addDirectoryUiEnabled && <DirectoryAddUI key={shape.id + 'directoryadd'} />
                }
                {
                    // ! Add File UI
                    addFileUiEnabled && <FileAddUI key={shape.id + 'fileadd'} />
                }
                <hr className={`w-full min-h-1 opacity-20`}></hr>
                {<p className="text-start w-full p-2 pb-0 font-bold">Files</p>}
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(3rem,_8%))] gap-3 p-4 w-full items-start text-3xl">
                    {[
                        // ! File UI
                        ...files.filter(({ name: fullname }) =>
                            !detached.find(({ attachment: { name, extension } }) =>
                                fullname === `${name}.${extension}`)).map((fileHandle, i) => <FileComponent fileHandle={fileHandle} key={fileHandle.name + '-' + i + '-' + shape.id} />),
                        // ! Add File Button
                        <button key={shape.id + "fileAddButton"} className={`w-full h-2/3 flex flex-col hover:brightness-110 hover:scale-110 disabled:opacity-50  transition-all duration-100`} disabled={addFileUiEnabled} onPointerDown={(e) => e.stopPropagation()} onClick={() => {
                            setAddFileUiEnabled(true);
                        }}>
                            <div className="w-full h-full bg-zinc-500 rounded-lg flex justify-center items-center">
                                <PlusIcon className="w-full h-full my-auto py-1" />

                            </div>
                        </button>
                    ]}
                </div>
                <hr className={`w-full min-h-1 opacity-20`}></hr>
                {!!detached.length && <p className="text-start w-full p-2 pb-0 font-bold mt-auto">Files on canvas</p>}
                <div className="grid grid-cols-[repeat(auto-fit,_minmax(2rem,_5%))] gap-2 p-4 w-full items-start text-3xl">
                    {[
                        // ! Detached File UI
                        ...detached.filter(({ attachment: { name } }) => !!name).map(({ shapeId, attachment: { extension, name } }) => {
                            return <div
                                key={name + '-' + shapeId + '-detached'}
                                className={`w-full h-full pointer-events-none opacity-20`}
                            >
                                <FileIcon extension={name ?? undefined} {...(extension ? defaultStyles[extension as DefaultExtensionType] : defaultStyles.cs)} />
                            </div>;
                        })
                    ]}
                </div>
            </div>}
    </div>


}
export default Component;