import { PluginProps } from "@/plugins/base"
import { PluginStore } from "@/stores/plugin";
import { TLUiOverrides } from "tldraw"

// ? Lists all possible UI overrides, this does not decide which ones are actually shown it just lists the available ones to pick from
export const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
        // Create a tool item in the ui's context.
        tools.rect = {
            id: 'rect',
            icon: 'geo-rectangle',
            label: 'Rect',
            kbd: 'r',
            onSelect: () => {
                editor.setCurrentTool('rect')
            },
        }
        return tools
    },
}