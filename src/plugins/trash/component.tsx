import { TLShape, useEditor } from "tldraw";
import { createRef, useRef, useState } from "react";
import TrashPlugin, { TrashData } from "./plugin";
import { unwrapShape } from "@/util/pluginUtil";


const Component = ({ shape, data }: { shape: TLShape, data?: TrashData }) => {    
    const editor = useEditor();
    const inputEl = useRef<HTMLInputElement | null>(null);

    return <div key={shape.id} className="w-fit max-w-full max-h-full h-fit flex flex-col justify-center" onPointerDown={(e) => e.stopPropagation()}>
        <p className="text-lg mb-2 text-nowrap overflow-hidden h-fit">{inputEl.current?.checked ? 'Delete Files' : 'Send back to folder'}</p>
        <label htmlFor={`toggle-${shape.id}`} className="m-auto bg-gray-50 cursor-pointer relative max-w-20 h-8 rounded-lg w-full">
            <input ref={inputEl} type="checkbox" id={`toggle-${shape.id}`} checked={unwrapShape<TrashData>(shape)?.data?.delete} className="sr-only peer group" onChange={() => {                
                TrashPlugin.serializePluginData(shape, {
                    delete: !!inputEl.current?.checked
                }, editor);
            }} />
            <span className="max-w-10 w-1/2 h-[calc(100%-0.5rem)] bg-green-500 absolute rounded-md left-1 right-auto top-1  peer-checked:bg-red-600 peer-checked:left-auto peer-checked:right-1 transition-all duration-200"></span>
        </label>
    </div>
}
export default Component;