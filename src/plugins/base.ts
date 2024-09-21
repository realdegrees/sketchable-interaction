import { usePluginStore } from "@/stores/plugin";
import EventEmitter from "events";
import { Editor, JsonObject, TLArrowShape, TLShape, TLShapeId } from "tldraw";
import z, { ZodSchema } from "zod";

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

export default abstract class BasePlugin<
  DataSchema = JsonObject,
  ShapeType extends TLShape = TLShape
> {
  public connectedShapes: Set<TLShapeId> = this.loadConnectedShapes();
  public destroyed: boolean = false;
  private interval: NodeJS.Timeout | undefined;
  private eventEmitter: EventEmitter = new EventEmitter();
  protected editor?: Editor;

  constructor(private _config: PluginConfig, public shape: ShapeType) {
    if (_config.tickRate) {
      this.interval = setInterval(() => {
        this.eventEmitter.emit("tick");
      }, _config.tickRate);
    }
  }

  /**
   * Used to set the editor reference
   * @param editor Tldraw editor instance
   */
  public setEditor(editor: Editor) {
    this.editor = editor;
    console.log(`Editor set ${this.shape.id}`);
    this.eventEmitter.emit("editor", editor);
  }

  /**
   * Subscribe to an event that gets fired when the editor reference has been set
   * @param callback
   * @returns An unsubscribe method
   */
  public onEditorSet(callback: (editor: Editor) => void): () => void {
    this.eventEmitter.on("editor", callback);
    if (this.editor) callback(this.editor);
    return () => this.eventEmitter.off("editor", callback);
  }

  /**
   * This is a utility method to see if a constructor is of type BasePlugin
   * @param constructor
   * @returns
   */
  public static isSubclass(
    constructor?: new (...args: unknown[]) => unknown
  ): boolean {
    return !!constructor && constructor.prototype instanceof this;
  }

  /**
   * This gets called when the tldraw editor updates the internal shape reference
   * @param shape The updated shape
   */
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

  /**
   * Saves the provided data to the shape's meta
   * @param data This data must match the zod schema provided in the plugin's config.ts
   * @returns
   */
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

  /**
   * Internal Method to save a jsonobject to the shape's meta
   * @param key
   * @param jsonObject
   * @returns
   */
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

  /**
   * The id of the associated shape
   */
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

  /**
   * Connected shapes are saved in memory accessible via the connectedShapesproperty and persisted on a shape's meta property
   * @param shapeId
   * @param createArrow Should a locked transparent arrow be added going from this shape to the colliding shape?
   * @returns
   */
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
  /**
   * Disconnects the specified shape, connected indicator arrows are cleaned up autoamtically
   * @param shapeId
   * @returns
   */
  public disconnectShape(shapeId: TLShapeId): void {
    if (!this.connectedShapes.delete(shapeId)) return;
    this.saveConnectedShapes();
  }

  public disconnectAllShapes(): void {
    this.connectedShapes = new Set();
    this.saveConnectedShapes();
  }
  /**
   * Called when another shape starts a collision with this one
   * @param data The data attached to this shape
   * @param colliding The shape, plugin and attached data of the colliding shape
   */
  public abstract onCollisionStart(
    data: DataSchema | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void>;
  /**
   * Called when another shape ends a collision with this one
   * @param data The data attached to this shape
   * @param colliding The shape, plugin and attached data of the colliding shape
   */
  public abstract onCollisionEnd(
    data: DataSchema | undefined,
    colliding: {
      shape: Partial<TLShape> & { id: TLShapeId; meta: JsonObject };
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void>;

  /**
   * Called when the shape is deleted in tldraw
   */
  public onDelete(): void {
    this.disconnectAllShapes();
  }
  /**
   * Called when the shape is being hovered by the pointer
   */
  public onShapeHovered(): void {
    this.updateArrows({ opacity: 0.2 });
  }
  /**
   * Called when the shape is being unhovered by the pointer
   */
  public onShapeUnhovered(): void {
    this.updateArrows({ opacity: 0 });
  }

  /**
   * Subscribe to an event emitted by the plugin instance via BasePlugin.emit
   * @param type The event id string
   * @param callback A callback method that gets called when the specified event fires
   * @returns
   */
  public on<T = unknown>(
    type: string,
    callback: (value?: T) => void
  ): () => void {
    this.eventEmitter.on(type, callback);
    return () => this.eventEmitter.off(type, callback);
  }

  /**
   * Use this to emit the specified payload in the specified type event channel
   * Can be utilized to communicate with the plugin component
   * @param type
   * @param payload
   */
  public emit(type: string, payload?: unknown) {
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
