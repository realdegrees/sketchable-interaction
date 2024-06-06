import { Component } from "react";
import { TLShape } from "tldraw";

// ! TODO: create react component for each plugin that gets loaded in the plugin component and saved to the plugin library so that it can be attached to shapes for custom UI ona  per-plugin basis
// TODO implement basic functions like deletability
export interface PluginProps{
  id: string;
  label?: string;
  color?: string;
  continousCollision?: boolean;
}
// ? possibly add an array that holds references to all shapes of the plugin type (maintained in onCreate and onDelete)
// TODO add a data structure that holds references to other shapes (e.g. conveyor belt holds references to items on it)
export default abstract class BasePlugin {
  constructor(protected props: PluginProps) {}

  public get id(): string {
    return this.props.id;
  }

  public get properties(): PluginProps {
    return { ...this.props };
  }

  // ! might need to pass a reference to the editor as well here (probably for all methods)
  public onCollision(pluginShape: TLShape, collidingShape: TLShape, source: 'user' | 'tool'): void {
    console.info(
      `Collision between ${pluginShape.id} and ${collidingShape.id}`
    );
  }
  public onCreate(shape: TLShape): void {
    console.info(`${this.id} shape created`);
  }
  public onDelete(shape: TLShape): void {

  }
}
