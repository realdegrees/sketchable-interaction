import { useEffect, useState } from "react";
import { PluginComponent } from "@/stores/plugin";
import RenamePlugin from "./plugin";
import { RenameData } from "./config";
import { InputRow } from "./inputRow";

const Component: PluginComponent<RenameData, RenamePlugin> = ({ shape, data, plugin }) => {
    const [pattern, setPattern] = useState<string>(data?.pattern ?? '');
    const [replace, setReplace] = useState<string>(data?.replace ?? '');

    useEffect(() => {
        plugin?.saveDataToShape({
            pattern,
            replace
        })
    })
    return <div className="w-fit max-w-full max-h-full h-fit flex flex-col justify-center" onPointerDown={(e) => e.stopPropagation()}>
        <InputRow label="Pattern" value={pattern} onChange={setPattern} />
        <InputRow label="Replace with" value={replace} onChange={setReplace} />
    </div>

}
export default Component;