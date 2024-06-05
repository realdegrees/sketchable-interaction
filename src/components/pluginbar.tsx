import { usePluginStore } from "@/stores/plugin";

const PluginBar = () => {
    const { selected, setPlugin } = usePluginStore();

    return (
        <div id="pluginbar" className="absolute bottom-20 left-1/2 -translate-x-1/2 flex">
            <p>Current: {selected}</p>
            <div id="plugin-trash" className="flex justify-center items-center w-14 h-14 rounded overflow-hidden hover:brightness-125" onClick={() => {
                setPlugin('plugin-trash')
            }}>
                <p className="text-ellipsis absolute bottom-1 max-w-full overflow-hidden pointer-events-none">
                    {'Trash'}
                </p>
            </div>
            <div id="plugin-magnify" className="flex justify-center items-center w-14 h-14 rounded overflow-hidden hover:brightness-125" onClick={() => {
                setPlugin('plugin-magnify')
            }}>
                <p className="text-ellipsis absolute bottom-1 max-w-full overflow-hidden pointer-events-none">
                    {'Magnify'}
                </p>
            </div>
        </div>
    )
}
export default PluginBar;