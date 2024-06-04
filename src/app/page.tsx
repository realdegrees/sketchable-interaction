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
    console.log(tools);

    return (
      <DefaultToolbar {...props}>
        {Object.keys(tools).map((id) => <TldrawUiMenuItem key={id} {...tools[id]} isSelected={useIsToolSelected.call(undefined, tools[id])} />)}
      </DefaultToolbar>
    )
  }, // https://tldraw.dev/examples/ui/add-tool-to-toolbar
}

const getUiOverrides = (ids: string[]): TLUiOverrides => ({
  tools(editor, toolsContext) {
    const customTools: TLUiToolItem[] = ids.map((id) => ({
      id,
      icon: `${id}-icon`,
      label: id,
      kbd: id.charAt(0),
      onSelect: () => {
        editor.setCurrentTool(id);
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

const loadTools = (ids: string[]): Promise<Tool[]> => {
  return Promise.all<Tool>(ids.map(async (id) => (await import(`../app/tools/${id}/tool`)).default));
}

const Main = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [uiOverrides, setUiOverrides] = useState<TLUiOverrides>();

  useEffect(() => {
    // Use IIFE here because useEffect hook does not allow async/await
    (async () => {
      // Load available tools from API
      const toolIDs: string[] = await fetch('/api/tools').then((res) => res.json());
      const tools = await loadTools(toolIDs);
      setTools(tools);

      // Create UiOverrides from tools
      const uiOverride: TLUiOverrides = getUiOverrides(toolIDs);
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
