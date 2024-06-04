import Tool from "../../tools/base";
import { readdir } from "fs/promises";
import dynamic from "next/dynamic";
import path from "path";
import { lazy } from "react";
import Folder from '../../tools/folder/tool';

const toolDir = path.join(process.cwd(), "src/app/tools");
const loadTools = () =>
  readdir(toolDir, { withFileTypes: true }).then(async (dirent) => {
    const tools = await Promise.all(
      dirent
        .filter((dirent) => dirent.isDirectory())
        .map(async ({ name }) => {
          try {
            console.log(`Loading Tool: ${name}`);
            const m = await import(`../../tools/${name}/tool`);
            console.log(`Loaded ${name}`);
            return m.default;
          } catch (e) {
            console.log(`Error while loading tool "${name}"!`);
            console.log(e);
            
          }
        })
    );
    return tools.filter((tool) => !!tool);
  });

export const GET = async () => {
  console.log("LOADING TOOLS");
  const tools = await loadTools();
  console.log("TOOLS:");
  console.log(tools);

  return Response.json(tools);
};
