import { unwrapShape } from "@/util/pluginUtil";
import { Editor, JsonObject, TLArrowShape, TLShape, TLShapeId } from "tldraw";
import z, { ZodSchema } from "zod";

// ! TODO: create react component for each plugin that gets loaded in the plugin component and saved to the plugin library so that it can be attached to shapes for custom UI ona  per-plugin basis
// TODO implement basic functions like deletability
// TODO add tldraw's props type as Partial for default props like color, border, font etc. so they can be inserted directly at shape creation
export const PluginPropsSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  availableShapes: z.array(z.union([z.string(), z.enum(["rect"])])),
  continousCollision: z.boolean().optional(),
  useableAsTool: z.boolean().optional(),
  moveable: z.boolean().optional(),
  deletable: z.boolean().optional(),
  onlyCustomComponent: z.boolean().optional(),
  pluginDataSchema: z.instanceof(ZodSchema),
});
export type PluginProps = z.infer<typeof PluginPropsSchema>;

export const SerializablePluginPropsSchema = PluginPropsSchema.extend({
  pluginDataSchema: z.boolean().nullable(),
});
export type SerializablePluginProps = z.infer<
  typeof SerializablePluginPropsSchema
>;

export const PluginAttachment = z.object({
  dir: z.string(),
  extension: z.string().optional(),
  name: z.string().optional(),
  sourceShape: z.custom<TLShapeId>(),
});
export type PluginAttachment = z.infer<typeof PluginAttachment>;

// TODO maybe add effects automatically on collision so it doesn't have to be repeated in each plugin (add plugin name as effect during collision)
// ! Possible effects that can be attached to plugin data, plugins can decide themselves what to do with it
export const SIEffectsSchema = z.enum(["magnify", "invert", "edit"]);
export type SIEffects = z.infer<typeof SIEffectsSchema>;

// ? possibly add an array that holds references to all shapes of the plugin type (maintained in onCreate and onDelete)
// TODO add a data structure that holds references to other shapes (e.g. conveyor belt holds references to items on it)
export default abstract class BasePlugin<DataSchema = JsonObject> {
  public activeShapes: Set<TLShapeId> = new Set();
  public connectedShapes: /*ShapeTree*/ Map<TLShapeId, TLShapeId[]> = new Map(); // TODO change all usages of this to

  constructor(protected props: PluginProps) {}

  tick(editor: Editor): void {}

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

  public serializePluginData(
    shape: TLShape | undefined,
    data: DataSchema,
    editor: Editor
  ): boolean {
    shape = shape && editor.getShape(shape);

    if (!shape) return false;

    const validated = this.props.pluginDataSchema.safeParse(data).data as
      | DataSchema
      | undefined;

    if (!validated) {
      console.warn(`Unable to serialize plugin data for ${shape.id}`, data);
      return false;
    }

    editor.updateShape({
      ...shape,
      meta: {
        ...shape.meta,
        [this.props.id]: validated,
      },
    });

    return true;
  }

  public connectShape(
    sourceShapeId: TLShapeId,
    shapeId: TLShapeId,
    editor: Editor,
    createArrow: boolean = false
  ): void {
    this.connectedShapes.set(sourceShapeId, [
      ...(this.connectedShapes.get(sourceShapeId) ?? []),
      shapeId,
    ]);

    if (!createArrow) return;

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
    sourceShapeId: TLShapeId,
    shapeId: TLShapeId,
    editor: Editor
  ): void {
    this.connectedShapes.set(sourceShapeId, [
      ...(this.connectedShapes.get(sourceShapeId) ?? []).filter(
        (id) => id !== shapeId
      ),
    ]);
  }
  public disconnectAllShape(sourceShapeId: TLShapeId, editor: Editor): void {
    this.connectedShapes.delete(sourceShapeId);
  }
  // ! might need to pass a reference to the editor as well here (probably for all methods)
  public abstract onCollisionStart(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: DataSchema;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void>;
  public abstract onCollisionEnd(
    editor: Editor,
    self: {
      shape: TLShape;
      data?: DataSchema;
    },
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void>;
  public abstract onCreate(editor: Editor, shape: TLShape): void;
  public onDelete(editor: Editor, shapeId: TLShapeId, data?: JsonObject): void {
    this.disconnectAllShape(shapeId, editor);
    Array.from(this.connectedShapes.keys()).forEach((sourceShape) => {
      this.disconnectShape(sourceShape, shapeId, editor);
    });
  }
  public onShapeHovered(shapeId: TLShapeId, editor: Editor): void {
    this.updateArrows(editor, shapeId, { opacity: 0.2 });
  }
  public onShapeUnhovered(shapeId: TLShapeId, editor: Editor): void {
    this.updateArrows(editor, shapeId, { opacity: 0 });
  }

  private collisionListeners: Map<
    TLShapeId,
    {
      type: "collision-start" | "collision-end";
      callback: (value: unknown) => void;
    }[]
  > = new Map();

  public on<T = unknown>(
    type: "collision-start" | "collision-end",
    shapeId: TLShapeId,
    callback: (value?: T) => void
  ): () => void {
    this.collisionListeners.set(shapeId, [
      ...(this.collisionListeners.get(shapeId) ?? []),
      {
        type,
        callback: callback as (value: unknown) => void,
      },
    ]);
    return this.off.bind(this, type, shapeId);
  }

  public off(type: "collision-start" | "collision-end", shapeId: TLShapeId) {
    this.collisionListeners.set(
      shapeId,
      this.collisionListeners
        .get(shapeId)
        ?.filter(({ type: t }) => t !== type) ?? []
    );
  }

  protected informCollisionListeners(
    type: "collision-start" | "collision-end",
    shapeId: TLShapeId,
    payload: unknown
  ) {
    this.collisionListeners
      .get(shapeId)
      ?.forEach(({ type: t, callback }) => t === type && callback(payload));
  }

  private updateArrows(
    editor: Editor,
    shapeId: TLShapeId,
    updatedSettings: Partial<TLShape>
  ) {
    const arrows = editor
      .getArrowsBoundTo(shapeId)
      .map(({ arrowId }) => editor.getShape(arrowId))
      .filter((arrow): arrow is TLArrowShape => !!arrow)
      .filter(({ isLocked }) => isLocked);
    //.filter((shape) => !isPluginShape(shape));

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
