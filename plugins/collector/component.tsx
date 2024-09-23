import { useEffect, useState } from "react";
import {  useEditor } from "tldraw";
import ArrowDown from '~icons/mingcute/down-fill.jsx';
import Edit from '~icons/material-symbols/edit-outline';
import { InputRow } from "./inputRow";
import { PluginComponent } from "@/stores/plugin";
import { CollectorData } from "./config";
import CollectorPlugin from "./plugin";

const FILTERS = [
    'all',
    'name',
    'filetype'
] as const;
export type FilterType = typeof FILTERS[number];
export type FilterSettings = {
    'Name': string,
    'Mediatype': string,
    'Extension(s)': string,
    'Size Max (MB)': string,
    'Size Min (MB)': string,
}


export type CollectorConnectionState = 'input' | 'output' | 'both' | 'none';

const Component: PluginComponent<CollectorData, CollectorPlugin> = ({ shape, data, plugin }) => {    
    const editor = useEditor();
    const [connectionState, setConnectionState] = useState<CollectorConnectionState>('none');
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const [collectorName, setCollectorName] = useState<string>('Filter');

    useEffect(() => {
        return (plugin as CollectorPlugin).subscribeConnectionState(setConnectionState);
    }, [shape.id, data, plugin]);


    const [filterValues, setFiltervalues] = useState<CollectorData>(data ?? {
        'Name': '',
        'Mediatype': '',
        'Extension(s)': '',
        'Size Max (MB)': '',
        'Size Min (MB)': '',
    });

    if (connectionState === 'none') {
        return <p className="p-4 text-lg">Drag other collectors here to create a filter system</p>
    }

    return <div className="p-4 text-lg w-full h-full overflow-auto">
        <div className={`flex flex-row w-fit`} onPointerDown={(e) => e.stopPropagation()} >
            {showMenu
                ? <input className="w-full text-black" placeholder="Enter filter name" value={collectorName} onChange={({ currentTarget: { value } }) => setCollectorName(value)} onPointerDown={(e) => e.stopPropagation()} />
                : <p className={`align-middle text-2xl font-bold`} onClick={() => {
                    setShowMenu(!showMenu);
                }}>
                    {collectorName}
                </p>
            }

            <div onClick={() => {
                setShowMenu(!showMenu);
            }}>
                {showMenu ? <ArrowDown className={`ml-4 m-auto w-fit h-full`} /> : <Edit className={`ml-4 m-auto w-fit h-full`} />}
            </div>
        </div>
        <hr className={`${connectionState === 'input' && 'bg-green-400 '}
            ${connectionState === 'output' && 'bg-blue-400 '}
            ${connectionState === 'both' && 'bg-orange-400 '}} mt-2 mb-4 h-1`}></hr>
        {!showMenu
            ? <div className="flex flex-col text-lg text-nowrap">
                {Object.entries(filterValues).map(([label, value]) => <div key={label + '-' + shape.id} className="flex flex-row">
                    <p className="font-bold">{label}:</p>
                    <p className="pl-2">{value || '-'}</p>
                </div>)}
            </div>
            : <form className={`transition-all ${!showMenu && 'hidden'} h-fit duration-300`}>
                {Object.entries(filterValues).map(([label, value]) => <InputRow key={label + '-' + shape.id} label={label} value={value} onChange={(value) => {
                    setFiltervalues({
                        ...filterValues,
                        [label]: value
                    });
                    plugin?.saveDataToShape({
                        ...filterValues,
                        [label]: value
                    });
                }} />)}
            </form>}

    </div>

}
export default Component;