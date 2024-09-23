import { JsonObject, TLArrowShape, TLShape, TLShapeId, Vec } from "tldraw";
import BasePlugin from "../base";
import { RenameData } from "./config";
import { FileData } from "../file/config";
import { PluginUtil } from "@/util/pluginUtil";
import FolderPlugin from "../folder/plugin";
import { getArrowCoordinates } from "@/util/collision";

export default class RenamePlugin extends BasePlugin<RenameData> {
  public async onCollisionStart(
    data: RenameData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (!data?.pattern || colliding.plugin.id !== "file") return; // Only switch editor UI when colliding with files

    const fileData = colliding.plugin.config.pluginDataSchema.safeParse(
      colliding.data
    ).data as JsonObject as FileData | undefined;

    const { name, extension, sourceShape, dir } = fileData ?? {};

    if (!name || !extension || !sourceShape || !dir) return;

    const folderPlugin = PluginUtil.getPlugin<FolderPlugin>(sourceShape);
    console.log(folderPlugin);

    const folderHandle = folderPlugin?.handles?.directory;
    const originalFileHandle = folderPlugin?.handles?.files.find(
      ({ name: fname }) => fname === `${name}.${extension}`
    );
    const file = await originalFileHandle?.getFile();

    if (!file || !folderHandle) return;
    const patternMatcher = new RegExp(data.pattern, "g");
    let newName = name.replaceAll(patternMatcher, data.replace ?? "");
    if (newName === name) return;

    // Create a copy of the file with the new name
    const getCopyName = (name: string, cnt: number) =>
      cnt === 0 ? name : `${name} (${cnt})`;
    let copyCnt = 0;
    let copyHandle: FileSystemFileHandle | undefined;
    while (true) {
      let exists: FileSystemFileHandle | undefined;
      try {
        exists = await folderHandle.getFileHandle(
          `${getCopyName(newName, copyCnt)}.${extension}`,
          {
            create: false,
          }
        );
      } catch (e) {}
      if (exists) {
        copyCnt++;
      } else {
        copyHandle = await folderHandle.getFileHandle(
          `${getCopyName(newName, copyCnt)}.${extension}`,
          { create: true }
        );
        break;
      }
    }
    if (!copyHandle) return;

    const copyName = copyHandle.name
      .split(".")
      .slice(0, file.name.includes(".") ? -1 : 0)
      .join(".");

    const writeable = await copyHandle.createWritable();
    writeable.write(file).then(() => writeable.close());
    // Delete the old file
    await folderHandle.removeEntry(`${name}.${extension}`);
    this.editor?.deleteShape(colliding.shape.id);

    const w = "w" in colliding.shape.props ? colliding.shape.props.w : 0;
    const h = "h" in colliding.shape.props ? colliding.shape.props.h : 0;
    const coords = {
      x: colliding.shape.x + w / 2,
      y: colliding.shape.y + h / 2,
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

    const id = `shape:${copyName}-${extension}-${Date.now()}` as TLShapeId;
    await folderPlugin.spawnFile({
      coords,
      extension,
      name: copyName,
      options: {
        h,
        w,
        id,
        selectOnSpawn: this.editor?.getSelectedShapeIds().includes(colliding.shape.id)
      },
    });

    if (connectedConveyor && this.editor && id) {
      const { plugin: conveyorPlugin } =
        PluginUtil.unwrapShape(connectedConveyor) ?? {};
      conveyorPlugin?.connectShape(id);
    }
  }
  public async onCollisionEnd(
    data: RenameData | undefined,
    colliding: {
      shape: TLShape;
      plugin: BasePlugin;
      data?: JsonObject;
    }
  ): Promise<void> {
    if (colliding.plugin.id !== "file") return; // Only switch editor UI when colliding with files
    this.disconnectShape(colliding.shape.id);
    this.emit("end");
  }
}
