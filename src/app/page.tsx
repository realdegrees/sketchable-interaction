'use client';

import { DefaultToolbar, TLComponents, TLStateNodeConstructor, TLUiOverrides, TLUiToolItem, Tldraw, TldrawUiMenuItem, useIsToolSelected, useTools } from "tldraw";
import { useEffect, useState } from "react";
import Tool from "./tools/base";

const defaultComponents: TLComponents = {
  MainMenu: null, // https://tldraw.dev/examples/ui/custom-main-menu
  PageMenu: null, // https://tldraw.dev/examples/ui/custom-page-menu
  StylePanel: null, // https://tldraw.dev/examples/ui/custom-style-panel
}
const components: TLComponents = {
  ...defaultComponents,
  Toolbar: (props) => {
    const tools = useTools();
    return (
      <DefaultToolbar {...props}>
        {Object.keys(tools).map((id) => <TldrawUiMenuItem key={id} {...tools[id]} isSelected={useIsToolSelected.call(undefined, tools[id])} />)}
      </DefaultToolbar>
    )
  }, // https://tldraw.dev/examples/ui/add-tool-to-toolbar
}

const getUiOverrides = (tools: Tool[]): TLUiOverrides => ({
  tools(editor, toolsContext) {
    const customTools: TLUiToolItem[] = tools.map(({ properties: { label } }) => ({
      id: label,
      icon: `${label}-icon`,
      label,
      kbd: label.charAt(0),
      onSelect: () => {
        editor.setCurrentTool(label);
      },
    }))
    const usableTools: Record<string, TLUiToolItem> = {
      'hand': toolsContext['hand'],
      'select': toolsContext['select'],
    }
    customTools.forEach((tool) => (usableTools[tool.id] = tool))
    return usableTools;
  }
});

const Main = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [uiOverrides, setUiOverrides] = useState<TLUiOverrides>();

  useEffect(() => {
    // Use IIFE here because useEffect hook does not allow async/await
    (async () => {
      // Load available tools from API
      const tools: Tool[] = await fetch('/api/tools').then((res) => res.json());
      setTools(tools as unknown as Tool[]);
      console.log(`Tools loaded: ${tools.map(({ properties: { label } }) => label)}`);

      // Create UiOverrides from tools
      const uiOverride: TLUiOverrides = getUiOverrides(tools);
      setUiOverrides(uiOverride);
    })();
  }, []);

  return (
    <main className="w-full h-full">
      <Tldraw inferDarkMode
        components={components}
        overrides={uiOverrides}
        tools={tools as unknown as TLStateNodeConstructor[]} />
    </main>
  );
}
export default Main;
