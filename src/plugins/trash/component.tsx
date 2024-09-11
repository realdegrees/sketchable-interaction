import { TLShape } from "tldraw";
import { PluginData } from "../base";
import { useRef, useState } from "react";
import plugin, { TrashPlugin } from "./plugin";


const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    const [label, setLabel] = useState('Send back to folder');

    return <div className="w-fit max-w-full max-h-full h-fit flex flex-col justify-center" onPointerDown={(e) => e.stopPropagation()}>
        <p className="text-lg text-nowrap overflow-hidden h-fit">{label}</p>
        <label htmlFor="toggle" className="m-auto bg-gray-50 cursor-pointer relative max-w-20 h-8 rounded-lg w-full">
            <input type="checkbox" id="toggle" className="sr-only peer group" onChange={({ currentTarget: { checked } }) => {
                setLabel(checked ? 'Delete Files' : 'Send back to folder');
                (plugin as TrashPlugin).setTrashSettings(shape.id, {
                    delete: checked
                });
            }} />
            <span className="max-w-10 w-1/2 h-[calc(100%-0.5rem)] bg-green-500 absolute rounded-md left-1 right-auto top-1  peer-checked:bg-red-600 peer-checked:left-auto peer-checked:right-1 transition-all duration-200"></span>
        </label>
    </div>


}
export default Component;