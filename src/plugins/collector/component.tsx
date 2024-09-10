import { createRef, useCallback, useEffect, useState } from "react";
import { PluginData } from "../base";
import { TLShape } from "tldraw";
import collectorPlugin from "./plugin";

const FILTERS = [
    'all',
    'name',
    'filetype'
] as const;
export type FilterType = typeof FILTERS[number];
export type FilterSettings = { filterType: FilterType, filterValue: string }
// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension



/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    const filterType = createRef<HTMLSelectElement>();
    const textFilter = createRef<HTMLInputElement>();

    const [connectionState, setConnectionState] = useState<'parent' | 'child' | 'both' | 'none'>('none');

    const updatePluginRef = useCallback(() => {
        collectorPlugin.setCollectorFilter(shape.id, {
            filterType: filterType.current!.value as FilterType,
            filterValue: textFilter.current!.value
        });
    }, [filterType, textFilter, shape.id]);

    useEffect(() => {


        updatePluginRef();

        const hasConnectedShapes = !!collectorPlugin.connectedShapes.get(shape.id)?.length;
        const isConnectedShape = !!Array.from(collectorPlugin.connectedShapes.values()).find((shapes) => shapes.includes(shape.id));
        if (hasConnectedShapes && isConnectedShape) setConnectionState('both');
        else if (hasConnectedShapes && !isConnectedShape) setConnectionState('parent');
        else if (!hasConnectedShapes && isConnectedShape) setConnectionState('child');
        else setConnectionState('none');

    }, [updatePluginRef, shape.id]);




    return <div className="p-4 text-lg relative">
        <p className={`
            ${connectionState === 'parent' && 'bg-green-400 '}
            ${connectionState === 'child' && 'bg-blue-400 '}
            ${connectionState === 'both' && 'bg-orange-400 '}
            `}>Filter  {
                (() => {
                    switch (connectionState) {
                        case 'parent': return '(Input)';
                        case 'child': return '(Output)';
                        case 'both': return '(Input & Output)';
                    }
                })()
            }</p>
        <select name="Filter" id="filter" className="w-full h-fit dark:bg-black dark:text-white" defaultValue='default' ref={filterType} onChange={updatePluginRef}>
            {FILTERS.map((filter) =>
                <option key={filter} value={filter}>{filter.toPascalCase()}</option>
            )}
        </select>

        {filterType.current?.value !== 'all' && <input ref={textFilter} className="w-full h-fit text-lg dark:bg-black dark:text-white" onChange={updatePluginRef}></input>}
    </div>

}
export default Component;