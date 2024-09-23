import {
  Editor,
  JsonObject,
  TLArrowShape,
  TLShape,
  TLShapeId,
  Vec,
} from "tldraw";
import BasePlugin from "../base";
import { MetaPayload, PluginUtil } from "@/util/pluginUtil";
import { FileData } from "../file/config";
import FolderPlugin from "../folder/plugin";
import { usePluginStore } from "@/stores/plugin";
import { CopyData } from "./config";
import { CollectorData } from "../collector/config";
import { getArrowCoordinates } from "@/util/collision";

export default class CopyPlugin extends BasePlugin<CopyData> {
  public async onCollisionStart(
    data: CopyData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (colliding.plugin?.id !== "file") return;
    if (this.connectedShapes.has(colliding.shape.id)) return; // Stops infinite loop of new files sending a collision event
    this.connectShape(colliding.shape.id);

    const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;

    const { name, extension, sourceShape, dir } = fileData ?? {};

    if (!name || !extension || !sourceShape || !dir) return;

    const folderPlugin = PluginUtil.getPlugin<FolderPlugin>(sourceShape);

    const folderHandle = folderPlugin?.handles?.directory;
    const originalFileHandle = folderPlugin?.handles?.files.find(
      ({ name: fname }) => fname === `${name}.${extension}`
    );
    const file = await originalFileHandle?.getFile();

    if (!file || !folderHandle) return;
    const getCopyName = (name: string, cnt: number) =>
      `${name} - copy (${cnt})`;
    let copyCnt = 1;
    let copyHandle: FileSystemFileHandle | undefined;
    while (true) {
      let exists: FileSystemFileHandle | undefined;
      try {
        exists = await folderHandle.getFileHandle(
          `${getCopyName(name, copyCnt)}.${extension}`,
          {
            create: false,
          }
        );
      } catch (e) {}
      if (exists) {
        copyCnt++;
      } else {
        copyHandle = await folderHandle.getFileHandle(
          `${getCopyName(name, copyCnt)}.${extension}`,
          { create: true }
        );
        break;
      }
    }

    if (!copyHandle) return;

    const writeable = await copyHandle.createWritable();
    // No need to wait for this
    writeable
      .write(file)
      .then(() => writeable.close())
      .then(() =>
        this.emit("filecopied", {
          dir,
          sourceShape,
          extension,
          name: copyName,
        } as FileData)
      );

    const copyName = copyHandle.name.split(".")[0]; // fetch new file name in case the file existed and was name change

    const w = "w" in colliding.shape.props ? colliding.shape.props.w : 0;
    const h = "h" in colliding.shape.props ? colliding.shape.props.h : 0;
    const shapeW = "w" in this.shape.props ? this.shape.props.w : 0;
    const shapeH = "h" in this.shape.props ? this.shape.props.h : 0;
    const coords = {
      x: this.shape.x + shapeW / 2,
      y: this.shape.y + shapeH / 2,
    };

    const connectedConveyor = this.editor
      ?.getArrowsBoundTo(this.shape.id)
      .map(({ arrowId, handleId }) => {
        if (handleId !== "start") return;
        const shape: TLArrowShape = this.editor?.getShape(
          arrowId
        ) as TLArrowShape;
        if (shape?.isLocked) return;
        const { plugin } = PluginUtil.unwrapShape(shape) ?? {};
        return plugin?.id === "conveyor" ? shape : undefined;
      })[0];

    if (connectedConveyor && this.editor) {
      const {
        coords: [{ x: startX, y: startY }],
        origin,
      } = getArrowCoordinates(connectedConveyor, this.editor);
      const { x, y } = Vec.Add(origin, { x: startX, y: startY });
      coords.x = x;
      coords.y = y;
    }

    const id = `shape:${copyName}-${Date.now()}` as TLShapeId;
    this.connectShape(id);
    await folderPlugin.spawnFile({
      coords,
      extension,
      name: copyName,
      options: {
        h,
        w,
        id,
      },
    });

    if (connectedConveyor && this.editor && id) {
      const { plugin: conveyorPlugin } =
        PluginUtil.unwrapShape(connectedConveyor) ?? {};
      conveyorPlugin?.connectShape(id);
    }
  }
  public async onCollisionEnd(
    data: CollectorData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    this.disconnectShape(colliding.shape.id);
  }

  public onCreate(editor: Editor, shape: TLShape): void {}
}
