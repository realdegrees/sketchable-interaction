import { Component, ReactNode } from "react";

export interface ToolProperties {
  label: string;
  color: string;
}

export default abstract class Tool extends Component {
  protected label: string;
  protected color: string;
  protected elements: HTMLElement[] = [];

  public constructor(props: ToolProperties) {
    super({});
    const {label, color} = props;
    this.label = label;
    this.color = color;
  }

  public abstract drop(): void;
  public abstract enter(): void;
  public abstract leave(): void;

  public addElement() {

  }

  public render(): ReactNode {
    return (
      <div
        style={{
          background: this.color,
        }}
        className="flex justify-center items-center w-14 h-14 rounded overflow-hidden hover:brightness-125"
        onMouseEnter={this.enter}
        onMouseLeave={this.leave}
        onDrop={this.drop}
      >
        {/* {<Image alt={name} src={add relative path to icon in plugin folder here}/>} */}
        <p className="text-ellipsis absolute bottom-1 max-w-full overflow-hidden pointer-events-none">
          {this.label}
        </p>
      </div>
    );
  }
}
