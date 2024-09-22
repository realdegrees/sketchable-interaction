import { FileData } from "@/plugins/file/config";
import { FileWorkerData } from "../fileTransfer";

addEventListener(
  "message",
  async (
    event: MessageEvent<FileWorkerData>
  ) => {
    let transferSuccess = false;

    const { sourceDir, targetDir, fileHandle } = event.data;
    const file = await fileHandle.getFile();
    
    try {
      const newFileHandle = await targetDir.getFileHandle(file.name, {
        create: true,
      });

      const writeable = await newFileHandle.createWritable();
      await writeable.write(file);
      await writeable.close();
      transferSuccess = true;
    } catch (e) {
        console.warn(
          `Unable to create file in targetfolder`,
          `${sourceDir.name} -> ${file.name} -> ${targetDir.name}`
        );
        
    }
    if (transferSuccess) {
      let deleteSuccess = false;
      try {
        await sourceDir.removeEntry(file.name);
        deleteSuccess = true;
      } catch (e) {
        console.warn(
          `Unable to delete file in sourcefolder`,
          `${sourceDir.name} -> ${file.name} -> ${targetDir.name}`
        );
      }
    }

    self.postMessage(transferSuccess);
  }
);
