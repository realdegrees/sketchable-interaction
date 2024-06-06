import { TLShape } from "tldraw";

export interface PluginProps {
  id: string;
  label?: string;
}
// TODO possibly add an array that holds references to all shapes of the plugin type (maintained in onCreate and onDelete)
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
  public onCollision(pluginShape: TLShape, collidingShape: TLShape): void {
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
