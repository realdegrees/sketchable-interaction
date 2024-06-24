import { Component } from "react";
import { Editor, TLShape } from "tldraw";
import z from "zod";

// ! TODO: create react component for each plugin that gets loaded in the plugin component and saved to the plugin library so that it can be attached to shapes for custom UI ona  per-plugin basis
// TODO implement basic functions like deletability
export const PluginPropsSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  availableShapes: z.array(z.union([z.string(), z.enum(["rect"])])),
  continousCollision: z.boolean().optional(),
});
export type PluginProps = z.infer<typeof PluginPropsSchema>;

export const PluginDataSchema = z.object({
  attachments: z
    .object({
      // TODO Adjust filetypes to reflect all possible filetypes provided by the filesystem API
      type: z.union([z.literal("file"), z.literal("none")]),
      path: z.string(),
    })
    .array()
    .optional(),
});
export type PluginData = z.infer<typeof PluginDataSchema>;

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
  public abstract onCollision(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: PluginData;
    },
    colliding: {
      shape: TLShape;
      data?: PluginData;
    },
    source: "user" | "plugin"
  ): void;
  public abstract onCreate(editor: Editor, shape: TLShape): void;
  public abstract onDelete(data?: PluginData): void;
}
