import { createRef } from "react";
import { PluginData } from "../base";
import { TLShape } from "tldraw";


// TODO possibly use https://www.npmjs.com/package/file-icons-js to display specific icons for each file extension

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    const filterType = createRef<HTMLSelectElement>();
    const textFilter = createRef<HTMLInputElement>();
    console.log(filterType.current?.value);

    return <>
        <select name="Filter" id="filter" className="w-full h-fit text-lg" defaultValue='default' ref={filterType}>
            <option value="default" selected>Collect Anything</option>
            <option value="name">Name</option>
            <option value="filetype">Filetype</option> {/*Could possible add filesize too but would need to add that to the attachment data*/}
        </select>

        {filterType.current?.value !== 'default' && <input ref={textFilter}></input>}
    </>

}
export default Component;