import { TLShape } from "tldraw";

export interface PluginProps {
  id: string;
  label?: string;
}

export default abstract class BasePlugin {
  constructor(protected props: PluginProps) {}

  public get id(): string {
    return this.props.id;
  }

  public get properties(): PluginProps {
    return { ...this.props };
  }

  public onCollision(pluginShape: TLShape, collidingShape: TLShape): void {
    console.info(
      `Collision between ${pluginShape.id} and ${collidingShape.id}`
    );
  }
}
