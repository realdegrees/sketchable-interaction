import { usePluginStore } from "@/stores/plugin";
import EventEmitter from "events";
import { Editor, JsonObject, TLArrowShape, TLShape, TLShapeId } from "tldraw";
import z, { ZodSchema } from "zod";

// ! TODO: create react component for each plugin that gets loaded in the plugin component and saved to the plugin library so that it can be attached to shapes for custom UI ona  per-plugin basis
// TODO implement basic functions like deletability
// TODO add tldraw's props type as Partial for default props like color, border, font etc. so they can be inserted directly at shape creation
export const PluginConfigSchema = z.object({
  id: z.string(),
  label: z.string().nullish(),
  color: z.string().nullish(),
  availableShapes: z.array(z.union([z.string(), z.enum(["rect"])])),
  continousCollision: z.boolean().nullish(),
  useableAsTool: z.boolean().nullish(),
  moveable: z.boolean().nullish(),
  deletable: z.boolean().nullish(),
  onlyCustomComponent: z.boolean().nullish(),
  pluginDataSchema: z.instanceof(ZodSchema),
  tickRate: z.number().default(3000).nullish(),
});
export type PluginConfig = z.infer<typeof PluginConfigSchema>;

export const PluginAttachment = z.object({
  dir: z.string(),
  extension: z.string().optional(),
  name: z.string().optional(),
  sourceShape: z.custom<TLShapeId>(),
});
export type PluginAttachment = z.infer<typeof PluginAttachment>;

// ? possibly add an array that holds references to all shapes of the plugin type (maintained in onCreate and onDelete)
// TODO add a data structure that holds references to other shapes (e.g. conveyor belt holds references to items on it)
export default abstract class BasePlugin<
  DataSchema = JsonObject,
  ShapeType extends TLShape = TLShape
> {
  public connectedShapes: Set<TLShapeId> = this.loadConnectedShapes();
  private interval: NodeJS.Timeout | undefined;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(
    private _config: PluginConfig,
    protected shape: ShapeType,
    protected editor?: Editor
  ) {
    if (_config.tickRate) {
      this.interval = setInterval(() => {
        this.eventEmitter.emit("tick");
      }, _config.tickRate);
    }
  }

  public setEditor(editor: Editor) {
    this.editor = editor;
    this.eventEmitter.emit("editor", editor);
  }

  public onEditorSet(callback: (editor: Editor) => void): () => void {
    this.eventEmitter.on("editor", callback);
    return () => this.eventEmitter.off("editor", callback);
  }

  public static isSubclass(
    constructor?: new (...args: unknown[]) => unknown
  ): boolean {
    return !!constructor && constructor.prototype instanceof this;
  }

  public onShapeUpdate(shape: ShapeType) {
    const previousConfig = this.config;
    this.shape = shape;

    if (previousConfig?.tickRate !== this.config?.tickRate)
      this.restartInterval();
  }
  private restartInterval() {
    clearInterval(this.interval);
    const tickRate = this.config?.tickRate || this._config.tickRate;
    if (!tickRate) return;
    this.interval = setInterval(() => {
      this.eventEmitter.emit("tick");
    }, tickRate);
  }
  /**
   * Gets the current config for the plugin from the shape's meta
   */
  public get config(): PluginConfig {
    const configFromMeta = PluginConfigSchema.omit({
      pluginDataSchema: true,
    }).safeParse(this.shape.meta["config"]).data;

    return (
      (configFromMeta && {
        ...configFromMeta,
        pluginDataSchema: this._config.pluginDataSchema,
      }) ??
      this._config
    );
  }

  /**
   * Takes a config and saves it to the shape's meta
   * Use this to adjust the settings of a plugin
   * @param config
   * @returns
   */
  public setConfig(
    config: Omit<PluginConfig, "id" | "pluginDataSchema">
  ): PluginConfig | undefined {
    if (!this.updateShapeReference()) return;

    // Removes pluginDataSchema from config as it's not serializable and can't be saved to the shape
    const validated = PluginConfigSchema.omit({
      pluginDataSchema: true,
    }).safeParse(config).data;

    if (!validated) {
      console.warn(
        `Unable to serialize plugin data for ${this.shape.id}`,
        config
      );
      return;
    }
    this.saveToMeta("config", validated);
  }

  public saveDataToShape(data: DataSchema): boolean {
    if (!this.updateShapeReference()) return false;

    const validated = this._config.pluginDataSchema.safeParse(data).data as
      | DataSchema
      | undefined;

    if (!validated) {
      console.warn(
        `Unable to serialize plugin data for ${this.shape.id}`,
        data
      );
      return false;
    }

    this.saveToMeta(this._config.id, validated);
    return true;
  }
  private saveConnectedShapes() {
    this.saveToMeta("connectedShapes", Array.from(this.connectedShapes));
  }
  // ! Check if arrays are actually serializable for tldraw (they should be)
  private saveToMeta(
    key: string,
    jsonObject: Partial<JsonObject> | Partial<JsonObject>[] | string[] | string
  ) {
    if (!this.editor) {
      console.warn(
        "Tried to update shapeMeta but editor reference is not yet defined! Payload: ",
        jsonObject
      );
      return;
    }
    this.editor.updateShape({
      ...this.shape,
      meta: {
        ...this.shape.meta,
        [key]: jsonObject,
      },
    });
  }
  private loadConnectedShapes(): Set<TLShapeId> {
    try {
      const connectedShapesString = this.shape.meta["connectedShapes"];
      const connectedShapes: TLShapeId[] | undefined =
        connectedShapesString && JSON.parse(connectedShapesString.toString());
      return new Set(connectedShapes);
    } catch (e) {
      return new Set();
    }
  }

  public get id(): string {
    return this._config.id;
  }

  private updateShapeReference(): boolean {
    const latestShape = this.editor?.getShape(this.shape);
    if (!latestShape) {
      usePluginStore.getState().unregisterInstance(this.shape.id);
      return false;
    } else {
      this.shape = latestShape as ShapeType;
      return true;
    }
  }

  public connectShape(shapeId: TLShapeId, createArrow: boolean = false): void {
    if (this.connectedShapes.has(shapeId)) return;

    this.connectedShapes.add(shapeId);
    this.saveConnectedShapes();

    if (!createArrow) return;

    // Create an invisible arrow shape connecting both
    this.editor?.createShape({
      type: "arrow",
      opacity: 0,
      isLocked: true,
      props: {
        bend: 50,
        start: {
          boundShapeId: this.shape.id,
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
  public disconnectShape(shapeId: TLShapeId): void {
    if (!this.connectedShapes.delete(shapeId)) return;
    this.saveConnectedShapes();
  }
  public disconnectAllShapes(): void {
    this.connectedShapes = new Set();
    this.saveConnectedShapes();
  }
  // ! might need to pass a reference to the editor as well here (probably for all methods)
  public abstract onCollisionStart(
    data: DataSchema | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void>;
  public abstract onCollisionEnd(
    data: DataSchema | undefined,

    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void>;
  public onDelete(): void {
    this.disconnectAllShapes();
  }
  public onShapeHovered(): void {
    this.updateArrows({ opacity: 0.2 });
  }
  public onShapeUnhovered(): void {
    this.updateArrows({ opacity: 0 });
  }

  public on<T = unknown>(
    type: string,
    callback: (value?: T) => void
  ): () => void {
    this.eventEmitter.on(type, callback);
    return () => this.eventEmitter.off(type, callback);
  }

  protected emit(type: string, payload?: unknown) {
    this.eventEmitter.emit(type, payload);
  }

  private updateArrows(updatedSettings: Partial<TLShape>) {
    if (!this.editor) return;
    const arrows = this.editor
      .getArrowsBoundTo(this.shape.id)
      .map(({ arrowId }) => this.editor!.getShape(arrowId))
      .filter((arrow): arrow is TLArrowShape => !!arrow)
      .filter(({ isLocked }) => isLocked);

    this.editor!.updateShapes(
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
