'use client'

import { usePluginStore } from "@/stores/plugin"

const CurrentPluginDisplay = () => {
    const {selected} = usePluginStore();

    return <p>{`Selected Plugin: ${selected ?? 'None'}`}</p>
}
export default CurrentPluginDisplay;