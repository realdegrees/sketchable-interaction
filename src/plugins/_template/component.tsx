import { PluginComponent, usePluginStore } from "@/stores/plugin";
import { TemplateData } from "./config";
import TemplatePlugin from "./plugin";
import { useEditor } from "tldraw";
import { useEffect } from "react";

type ExampleDataType = {
    example: string;
}
const Component: PluginComponent<TemplateData, TemplatePlugin> = ({ shape, data, plugin }) => {
    // The component properties provide references to the shape, attached data and associated plugin
    // You can get a reference to the editor 
    const editor = useEditor();
    const pluginStore = usePluginStore();

    useEffect(() => {
        return plugin?.on<ExampleDataType>('someevent', (exampleData) => {
            // Here you can receive events fired from the plugin via BasePlugin.emit
        })
    }, [plugin])
    return <></>

}
export default Component;