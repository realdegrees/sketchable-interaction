import { useEffect, useState } from "react";
import { FileTypeSchema, PluginData } from "../base";
import { commonFilters, useFileSystem } from "use-file-system";
import LineMdAlertCircleTwotoneLoop from '~icons/line-md/alert-circle-twotone-loop';
import { TLShape, useEditor } from "tldraw";
import { ShapeMeta } from "@/components/tlwrap";
import plugin from "./plugin";
import FilePlugin from "@/plugins/file/plugin";

/* TODO when a file is dragged out of the folder create a new shape that holds the file info (path is probably enough)(create file plugin for these shapes) 
-> Attach the handle to that shape (maybe add handle to PluginData.files type) so that the file can be manipulated by plugins that interact with it
When the file is moved/renamed/deleted etc the UI of this component will automatically update to the fileSystem hook
*/
const Component = ({ shape, data }: { shape: TLShape, data?: PluginData }) => {
    return (
        <>
            <p>{data?.files?.[0].name}</p>
        </>
    )
}
export default Component;