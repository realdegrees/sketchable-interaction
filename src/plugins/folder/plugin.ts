import { TLShape } from "tldraw";
import BasePlugin, { PluginProps } from "../base";

const properties: PluginProps = {
  id: "folder",
};

class Folder extends BasePlugin {
  public onCollision(pluginShape: TLShape, collidingShape: TLShape): void {
    console.log("Collision");
  }
}
export default new Folder(properties);
