'use client'

import { PluginProps } from "@/plugins/base";
import { usePluginStore } from "@/stores/plugin";

const Plugin = ({ props: { id, label } }: { props: PluginProps }) => {
    const { setSelected } = usePluginStore();

    return (
        <div key={id} id={`plugin-${id}`} className="flex justify-center items-center w-14 h-14 rounded overflow-hidden hover:brightness-125" onClick={() => {
            setSelected(`plugin-${id}`)
        }}>
            <p className="text-ellipsis absolute bottom-1 max-w-full overflow-hidden pointer-events-none">
                {label ?? id}
            </p>
        </div>
    )
}
export default Plugin;