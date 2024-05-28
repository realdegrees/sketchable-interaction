'use client';

import { DefaultToolbar, TLComponents, TLStateNodeConstructor, TLUiOverrides, TLUiToolItem, Tldraw, TldrawUiMenuItem, useIsToolSelected, useTools } from "tldraw";
import { useEffect, useState } from "react";

const activeTools: string[] = ['folder'];
const toolLoader = Promise.all<TLStateNodeConstructor>(activeTools.map(async (toolName) => {
  const toolModule = await import(`./toolbar/tools/${toolName}`);
  const ToolClass = toolModule.default;
  ToolClass.id = toolName;
  return ToolClass;
}));

const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    console.log(tools);
    
    const customTools: TLUiToolItem[] = activeTools.map((name) => ({
        id: name,
        icon: `${name}-icon`,
        label: name,
        kbd: name.charAt(0),
        onSelect: () => {
          editor.setCurrentTool(name);
        },
      }))
    const usableTools: Record<string, TLUiToolItem> = {
      'hand': tools['hand'],
      'select': tools['select'],
    }
    customTools.forEach((tool) => (usableTools[tool.id] = tool))
    return usableTools;
  },
};
const components: TLComponents = {
  MainMenu: null, // https://tldraw.dev/examples/ui/custom-main-menu
  PageMenu: null, // https://tldraw.dev/examples/ui/custom-page-menu
  StylePanel: null, // https://tldraw.dev/examples/ui/custom-style-panel
  Toolbar: (props) => {
    const tools = useTools();    
    return (
      <DefaultToolbar {...props}>
        {Object.keys(tools).map((id) => <TldrawUiMenuItem key={id} {...tools[id]} isSelected={useIsToolSelected.call(this, tools[id])} />)}
      </DefaultToolbar>
    )
  }, // https://tldraw.dev/examples/ui/add-tool-to-toolbar
  
}
export default function Home() {
  const [tools, setTools] = useState<TLStateNodeConstructor[]>([]);

  useEffect(() => {
    toolLoader.then(setTools);
  }, []);
  console.log(tools);
  
  return (
    <main className="w-full h-full">
      <Tldraw inferDarkMode 
      components={components} 
      overrides={uiOverrides}
      tools={tools}/>
    </main>
  );
}
