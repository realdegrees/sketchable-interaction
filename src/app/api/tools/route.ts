import { readdir } from "fs/promises";
import path from "path";

const toolDir = path.join(process.cwd(), "src/app/tools");
const loadTools = () =>
  readdir(toolDir, { withFileTypes: true }).then(async (dirent) => {
    const tools = await Promise.all<string>(
      dirent
        .filter((dirent) => dirent.isDirectory())
        .map(async ({ name }) => name)
    );
    return tools;
  });

export const GET = async () => {
  console.log("LOADING TOOLS");
  const tools = await loadTools();
  console.log("TOOLS: " + tools);
  return Response.json(tools);
};
