import { TLShape } from "tldraw";
import BasePlugin, { PluginProps } from "../base";

const properties: PluginProps = {
  id: "folder",
};

class Folder extends BasePlugin {
  public onCollision(pluginShape: TLShape, collidingShape: TLShape): void {
    console.log("Collision");
  }
  public onCreate(shape: TLShape): void {
    // filename an shape meta heften
  }
}
export default new Folder(properties);

// explainable AI, control, self efficacy in software