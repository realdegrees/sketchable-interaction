import { TLShape, JsonObject, Editor } from "tldraw";
import BasePlugin from "../base";
import { TemplateData } from "./config";

export default class TemplatePlugin extends BasePlugin<TemplateData> {
  public async onCollisionStart(
    data: TemplateData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    // You can manipulate the colliding shape using this.editor
    // call methods on the colliding plugin, 
    // or parse the data of the colliding plugin and process it further
    // More useful methods can be overriden from the BasePlugin class
    // Use BasePlugin.emit to emit an event to the component to e.g. change a state
  }
  public async onCollisionEnd(
    data: TemplateData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    
  }
  
  public onCreate(editor: Editor, shape: TLShape): void {}
}
