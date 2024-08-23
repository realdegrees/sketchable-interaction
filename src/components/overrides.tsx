import { ConveyorOverride } from "@/custom-shapes/conveyor/override";
import { RectOverride } from "@/custom-shapes/rect/override";
import { TLUiOverrides } from "tldraw";

const overrideMap = [ConveyorOverride, RectOverride]

// ? Lists all possible UI overrides, this does not decide which ones are actually shown it just lists the available ones to pick from
export const overrides: TLUiOverrides = {
    tools(editor, tools) {
        overrideMap.forEach((uiOverrideFN) => {
            const uiOverride = uiOverrideFN(editor);
            tools[uiOverride.id] = uiOverride
        })
        return tools;
    },
}