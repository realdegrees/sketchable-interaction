import { Component } from "react";
import { Editor, TLShape, TLShapeId } from "tldraw";
import z from "zod";

// ! TODO: create react component for each plugin that gets loaded in the plugin component and saved to the plugin library so that it can be attached to shapes for custom UI ona  per-plugin basis
// TODO implement basic functions like deletability
// TODO add tldraw's props type as Partial for default props like color, border, font etc. so they can be inserted directly at shape creation
export const PluginPropsSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  availableShapes: z.array(z.union([z.string(), z.enum(["rect"])])),
  continousCollision: z.boolean().optional(),
  useableAsTool: z.boolean().default(true),
  onlyCustomComponent: z.boolean().optional()
});
export type PluginProps = z.infer<typeof PluginPropsSchema>;

export const PluginFileSchema = z.object({
  mimeType: z.string(),
  fullPath: z.string(),
  extension: z.string(),
  name: z.string(),
  sourceShape: z.custom<TLShapeId>(),
});
export type PluginFile = z.infer<typeof PluginFileSchema>;

export const PluginDataSchema = z.object({
  files: PluginFileSchema.array().optional(),
  state: z
    .object({
      interactable: z.boolean().default(true),
    })
    .optional(),
});
export type PluginData = z.infer<typeof PluginDataSchema>;

// ? possibly add an array that holds references to all shapes of the plugin type (maintained in onCreate and onDelete)
// TODO add a data structure that holds references to other shapes (e.g. conveyor belt holds references to items on it)
export default abstract class BasePlugin {
  public activeShapes: Set<TLShapeId> = new Set();
  constructor(protected props: PluginProps) {}

  public get id(): string {
    return this.props.id;
  }

  public get properties(): PluginProps {
    return { ...this.props };
  }
  public registerShape(shapeId: TLShapeId): void {
    this.activeShapes.add(shapeId);
  }
  public unregisterShape(shapeId: TLShapeId): void {
    this.activeShapes.delete(shapeId);
  }
  // ! might need to pass a reference to the editor as well here (probably for all methods)
  public abstract onCollision(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: PluginData;
    },
    source: "user" | "plugin"
  ): void;
  public abstract onCreate(editor: Editor, shape: TLShape): void;
  public abstract onDelete(shapeId: string, data?: PluginData): void;
}
