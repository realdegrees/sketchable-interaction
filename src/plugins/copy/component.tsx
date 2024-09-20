import { PluginComponent } from "@/stores/plugin";
import { CopyData } from "./config";
import CopyPlugin from "./plugin";
import { useEffect, useState } from "react";
import { FileData } from "../file/config";

const Component: PluginComponent<CopyData, CopyPlugin> = ({ shape, data, plugin }) => {  
    const [lastCopy, setLastCopy] = useState<FileData | undefined>(undefined);
    useEffect(() => {
        let timeout: NodeJS.Timeout | undefined;
        const unsubscribe = plugin?.on<FileData>('filecopied', (fileData) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                setLastCopy(undefined);
            }, 2000);
            setLastCopy(fileData);
        });
        return () => {
            clearTimeout(timeout);
            unsubscribe?.();
        }
    }, [plugin]) ;
    return <p className="text-lg">{
        !lastCopy ? 'Drag files here to copy them to this shapes center' : `Copied ${lastCopy.name} into ${lastCopy.dir}`}</p>;
}
export default Component;