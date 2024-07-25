/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
import {
    useEffect,
    useRef,
    useState,
    useCallback,
} from 'react';

export const useFileSystem = ({
    pollInterval = 500
}: {
    pollInterval: number;
}) => {
    const directoryHandle = useRef<FileSystemDirectoryHandle | undefined>(undefined);
    const pollingInterval = useRef<NodeJS.Timeout | undefined>(undefined);
    const [files, setFiles] = useState<FileSystemFileHandle[]>([]);
    const [directories, setDirectories] = useState<FileSystemDirectoryHandle[]>([]);

    const startPolling = useCallback(() => {
        // Start watching the directory for changes
        pollingInterval.current = setInterval(() => {
            try {
                // Iterate the directoryHandle and gather all subdirectories and files
                const currentDirectories: FileSystemDirectoryHandle[] = [];
                const currentFiles: FileSystemFileHandle[] = [];

                // @ts-ignore https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
                for (const handle of directoryHandle.current.values()) {
                    if (handle instanceof FileSystemDirectoryHandle) {
                        currentDirectories.push(handle);
                    } else if (handle instanceof FileSystemFileHandle) {
                        currentFiles.push(handle);
                    }
                }

                // TODO possibly add an option to check for deep file content changes
                // Check if there are any differences in file or directory names compared to the previous poll state
                const hasFileChanges = files.length === currentFiles.length && files.every(({ name }) => currentFiles.find(({ name: cname }) => name === cname));
                const hasDirectoryChanges = directories.length === currentDirectories.length && directories.every(({ name }) => currentDirectories.find(({ name: cdname }) => name === cdname));

                // Update state if any changes occured
                if (hasFileChanges) setFiles(currentFiles);
                if (hasDirectoryChanges) setDirectories(currentDirectories);
            } catch (e) {
                clearInterval(pollingInterval.current);
                setFiles([]);
                setDirectories([]);
                directoryHandle.current = undefined;
            }
        }, pollInterval)
    }, [files, directories, pollInterval]);

    // Clear the interval when the component is destroyed
    useEffect(() => () => clearInterval(pollingInterval.current));

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

    return { files, directories, directoryHandle, showDirectoryPicker }
};