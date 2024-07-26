/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
import {
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';
import { useUnmount } from './useUnmount';

// TODO add 'flatten' arg to optionally flatten all subfolders and return all files
export const useFileSystem = ({
    pollInterval = 500,
    onChange,
    startIn
}: {
    pollInterval?: number;
    startIn?: FileSystemDirectoryHandle;
    onChange?: (previous: {
        files: FileSystemFileHandle[],
        directories: FileSystemDirectoryHandle[]
    }, current: {
        files: FileSystemFileHandle[],
        directories: FileSystemDirectoryHandle[]
    }) => void;
}) => {
    const directoryHandle = useRef<FileSystemDirectoryHandle | undefined>(startIn);
    const pollingInterval = useRef<NodeJS.Timeout | undefined>(undefined);

    const [files, setFiles] = useState<FileSystemFileHandle[]>([]);
    const filesRef = useRef<FileSystemFileHandle[]>([]);
    const [directories, setDirectories] = useState<FileSystemDirectoryHandle[]>([]);
    const directoriesRef = useRef<FileSystemDirectoryHandle[]>([]);



    const poll = useCallback(async () => {
        try {
            // Iterate the directoryHandle and gather all subdirectories and files
            const currentDirectories: FileSystemDirectoryHandle[] = [];
            const currentFiles: FileSystemFileHandle[] = [];
            const prevFiles = filesRef.current;
            const prevDirectories = directoriesRef.current;

            // TODO find a way to run this async iterator in parallel
            // @ts-ignore https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
            for await (const handle of directoryHandle.current.values()) {
                if (handle instanceof FileSystemDirectoryHandle) {
                    currentDirectories.push(handle);
                } else if (handle instanceof FileSystemFileHandle) {
                    currentFiles.push(handle);
                }
            }

            // TODO possibly add an option to check for deep file content changes
            // Check if there are any differences in file or directory names compared to the previous poll state
            const hasFileChanges = prevFiles.length !== currentFiles.length
                || (prevFiles.length === currentFiles.length
                    && !prevFiles.every(({ name }) => currentFiles.find(({ name: cname }) => name === cname)));
            const hasDirectoryChanges = prevDirectories.length !== currentDirectories.length
                || (prevDirectories.length === currentDirectories.length
                    && !prevDirectories.every(({ name }) => currentDirectories.find(({ name: cdname }) => name === cdname)));

            if (hasFileChanges || hasDirectoryChanges) {
                // Fire onChange event with previous and current values
                onChange?.({
                    files,
                    directories
                }, {
                    files: currentFiles,
                    directories: currentDirectories
                });

                // Update state if any changes occured
                if (hasFileChanges) setFiles(currentFiles);
                if (hasDirectoryChanges) setDirectories(currentDirectories);
            }
        } catch (e) {
            console.log(`Error polling: ${directoryHandle.current?.name}`);
            console.log(e);

            clearInterval(pollingInterval.current);
            setFiles([]);
            setDirectories([]);
            directoryHandle.current = undefined;
        }
    }, [directories, files, onChange]);

    const startPolling = useCallback(() => {
        // Start watching the directory for changes
        poll();
        pollingInterval.current = setInterval(poll, pollInterval)
    }, [pollInterval, poll]);

    // Synchronize refs with state
    useEffect(() => {
        filesRef.current = files;
        directoriesRef.current = directories;

        if (directoryHandle.current) {
            clearInterval(pollingInterval.current);
            startPolling();
        }
    }, [files, directories, startPolling]);

    // Clear the interval when the component is destroyed
    useUnmount(() => {
        clearInterval(pollingInterval.current);
    });

    // should be called when the suer wants the directory picker dialogue to show
    const showDirectoryPicker = async () => {
        try {
            // @ts-ignore
            directoryHandle.current = await window.showDirectoryPicker?.()
            
        } catch (error) {
            console.error(`Error during directory selection:`);
            console.error(error);
        }
        if (directoryHandle.current) startPolling();
    };

    return {
        files,
        directories,
        rootHandle: directoryHandle.current,
        showDirectoryPicker: startIn ? undefined : showDirectoryPicker,
        isDirectoryPickerSupported: window !== undefined && 'showDirectoryPicker' in window
    }
};
