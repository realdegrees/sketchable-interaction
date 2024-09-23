import { useRef, useState } from "react";
import { PluginComponent } from "@/stores/plugin";
import { PluginUtil } from "@/util/pluginUtil";
import { TrashData } from "./config";
import TrashPlugin from "./plugin";


const Component: PluginComponent<TrashData, TrashPlugin> = ({ shape, data, plugin }) => {    

    const [deleteFiles, setDeleteFiles] = useState(!!data?.delete)

    return <div key={shape.id + '-checkbox'} className="w-fit max-w-full max-h-full h-fit flex flex-col justify-center" onPointerDown={(e) => e.stopPropagation()}>
        <p className="text-lg mb-2 text-nowrap overflow-hidden h-fit">{deleteFiles ? 'Delete from file system (!)' : 'Remove from canvas'}</p>
        <label htmlFor={`toggle-${shape.id}`} className="m-auto bg-gray-50 cursor-pointer relative max-w-20 h-8 rounded-lg w-full">
            <input type="checkbox" id={`toggle-${shape.id}`} checked={deleteFiles} className="sr-only peer group" onChange={({currentTarget: {checked}}) => {                
                plugin?.saveDataToShape({
                    delete: checked
                });
                setDeleteFiles(checked);
            }} />
            <span className="max-w-10 w-1/2 h-[calc(100%-0.5rem)] bg-green-500 absolute rounded-md left-1 right-auto top-1  peer-checked:bg-red-600 peer-checked:left-auto peer-checked:right-1 transition-all duration-200"></span>
        </label>
    </div>
}
export default Component;