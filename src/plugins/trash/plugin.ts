import { TLShape } from "tldraw";
import BasePlugin from "../base";
import properties from "./properties";


class Trash extends BasePlugin {
  onCollision(pluginShape: TLShape, collidingShape: TLShape): void {
    console.log("Collision");
  }
}

export default new Trash(properties);
