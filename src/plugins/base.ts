import { Component } from "react";
import { Editor, TLArrowShape, TLShape, TLShapeId } from "tldraw";
import z, { TypeOf } from "zod";

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
  onlyCustomComponent: z.boolean().optional(),
});
export type PluginProps = z.infer<typeof PluginPropsSchema>;

export const PluginAttachment = z.object({
  dir: z.string(),
  extension: z.string().optional(),
  name: z.string().optional(),
  sourceShape: z.custom<TLShapeId>(),
});
export type PluginAttachment = z.infer<typeof PluginAttachment>;

// ! Possible effects that can be attached to plugin data, plugins can decide themselves what to do with it
export const SIEffectsSchema = z.enum(["magnify", "invert"]);
export type SIEffects = z.infer<typeof SIEffectsSchema>;

// TODO maybe add some sort of plugindata map where a plugin can save plugin specific data to the shape without modifying the schema
// something like Map<PluginName, any>
// typing then just happens by retrieving the data and validating it
export const PluginDataSchema = z.object({
  attachments: PluginAttachment.array().optional(),
  state: z
    .object({
      activeEffects: z.array(SIEffectsSchema),
    }),
});
export type PluginData = z.infer<typeof PluginDataSchema>;
export type ShapeDisconnectEvent = (
  shapeId: TLShapeId,
  data: PluginData
) => void;

// ? possibly add an array that holds references to all shapes of the plugin type (maintained in onCreate and onDelete)
// TODO add a data structure that holds references to other shapes (e.g. conveyor belt holds references to items on it)
export default abstract class BasePlugin {
  public activeShapes: Set<TLShapeId> = new Set();
  public connectedShapes: Map<TLShapeId, TLShapeId[]> = new Map();

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

  public connectShape(
    sourceShapeId: TLShapeId,
    shapeId: TLShapeId,
    editor: Editor
  ): void {
    this.connectedShapes.set(sourceShapeId, [
      ...(this.connectedShapes.get(sourceShapeId) ?? []),
      shapeId,
    ]);

    // Create an invisible arrow shape connecting both
    editor.createShape({
      type: "arrow",
      opacity: 0,
      isLocked: true,
      props: {
        bend: 50,
        start: {
          boundShapeId: sourceShapeId,
          type: "binding",
          isExact: false,
          isPrecise: false,
          normalizedAnchor: {
            x: 0.5,
            y: 0.5,
          },
        },
        end: {
          boundShapeId: shapeId,
          type: "binding",
          isExact: false,
          isPrecise: false,
          normalizedAnchor: {
            x: 0.5,
            y: 0.5,
          },
        },
      },
    });
  }
  public disconnectShape(
    shape: TLShape,
    shapeId: string,
    editor: Editor
  ): void {
    this.connectedShapes.delete(shape.id);
  }
  public disconnectAllShape(sourceShapeId: TLShapeId, editor: Editor): void {
    this.connectedShapes.delete(sourceShapeId);
  }
  // ! might need to pass a reference to the editor as well here (probably for all methods)
  public abstract onCollisionStart(
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
  public abstract onCollisionEnd(
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
  public onShapeHovered(shapeId: TLShapeId, editor: Editor): void {
    this.updateArrows(editor, shapeId, { opacity: 0.2 });
  }
  public onShapeUnhovered(shapeId: TLShapeId, editor: Editor): void {
    this.updateArrows(editor, shapeId, { opacity: 0 });
  }

  private updateArrows(
    editor: Editor,
    shapeId: TLShapeId,
    updatedSettings: Partial<TLShape>
  ) {
    const arrows = editor
      .getArrowsBoundTo(shapeId)
      .map(({ arrowId }) => editor.getShape(arrowId))
      .filter((arrow): arrow is TLArrowShape => !!arrow);

    editor.updateShapes(
      arrows.map((arrow) => {
        return (
          arrow && {
            ...arrow,
            ...updatedSettings,
          }
        );
      })
    );
  }
}
