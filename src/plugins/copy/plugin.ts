import { Editor, JsonObject, TLShape, TLShapeId } from "tldraw";
import BasePlugin from "../base";
import { MetaPayload, PluginUtil } from "@/util/pluginUtil";
import { FileData } from "../file/config";
import FolderPlugin from "../folder/plugin";
import { usePluginStore } from "@/stores/plugin";
import { CopyData } from "./config";
import { CollectorData } from "../collector/config";

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
    let copyName: string = getCopyName(name, 1);
    while (true) {
      try {
        const exists = await folderHandle.getFileHandle(
          `${getCopyName(name, copyCnt)}.${extension}`,
          {
            create: false,
          }
        );
        if (exists) {
          copyCnt++;
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
    const copyHandle = await folderHandle.getFileHandle(
      `${getCopyName(name, copyCnt)}.${extension}`,
      {
        create: true,
      }
    );

    const writeable = await copyHandle.createWritable();
    await writeable.write(file);
    await writeable.close();
    
    copyName = copyHandle.name.split(".")[0]; // fetch new file name in case the file existed and was name changed

    this.emit("filecopied", {
      dir,
      sourceShape,
      extension,
      name: copyName
    } as FileData);

    const filePluginConfig = usePluginStore.getState().getPluginConfig("file", {
      pluginDataSchema: null,
    });
    const meta = {
      [filePluginConfig?.id ?? "file"]: {
        name: copyName,
        dir,
        extension,
        sourceShape,
      },
      config: { ...filePluginConfig, pluginDataSchema: null },
    } as MetaPayload<FileData>;

    const id = ("shape:" + copyName + "-" + Date.now()) as TLShapeId;

    this.connectShape(id);

    const w = "w" in colliding.shape.props ? colliding.shape.props.w : 0;
    const h = "h" in colliding.shape.props ? colliding.shape.props.h : 0;
    this.editor?.createShape({
      id,
      type: "rect",
      x: this.shape.x + w / 2,
      y: this.shape.y + h / 2,
      meta,
      props: {
        w: 100,
        h: 125,
      },
    });
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
