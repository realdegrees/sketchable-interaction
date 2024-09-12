import { createRef, useCallback, useEffect, useRef, useState } from "react";
import { PluginData } from "../base";
import { TLShape } from "tldraw";
import collectorPlugin from "./plugin";
import plugin from "./plugin";
import ArrowDown from '~icons/mingcute/down-fill.jsx';
import Edit from '~icons/material-symbols/edit-outline';

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
// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension


export type CollectorConnectionState = 'connected' | 'none';

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    const [connectionState, setConnectionState] = useState<CollectorConnectionState>('none');
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const [collectorName, setCollectorName] = useState<string>('Filter');

    useEffect(() => {
        return plugin.subscribeConnectionState(shape.id, setConnectionState);
    }, [shape.id]);


    const filterValues = useRef({
        'Name': '',
        'Mediatype': '',
        'Extension(s)': '',
        'Size Max (MB)': '',
        'Size Min (MB)': '',
    });
    const handleChange = () => {
        // This function can be implemented later to perform actions based on input changes
        collectorPlugin.setCollectorSettings(shape.id, filterValues.current);
    };

    const InputRow = ({ label, value }: { label: string, value: string }) => {
        const [filterValue, setFilterValue] = useState(value);
        return (
            <div className="flex flex-row justify-between pb-1 w-full overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
                {filterValue && <label className="text-nowrap pr-2 ">{label}</label>}
                <input
                    className="w-full text-black"
                    id={label}
                    value={filterValue}
                    placeholder={`Enter ${label}`}
                    onChange={({ currentTarget: { value } }) => {
                        console.log('change');
                        setFilterValue(value);
                        filterValues.current = { ...filterValues.current, [label]: value };
                        console.log(filterValues.current);

                        handleChange();
                    }}
                />
            </div>
        );
    };

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
        <hr className="mt-2 mb-4"></hr>
        {!showMenu
            ? <div className="flex flex-col text-lg text-nowrap">
                {Object.entries(filterValues.current).map(([label, value]) => <div key={label} className="flex flex-row">
                    <p className="font-bold">{label}:</p>
                    <p className="pl-2">{value || '-'}</p>
                </div>)}
            </div>
            : <form className={`transition-all ${!showMenu && 'hidden'} h-fit duration-300`}>
                {Object.entries(filterValues.current).map(([label, value]) => <InputRow key={label} label={label} value={value} />)}
            </form>}

    </div>

}
export default Component;