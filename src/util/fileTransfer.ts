export type FileWorkerData = {
  sourceDir: FileSystemDirectoryHandle;
  targetDir: FileSystemDirectoryHandle;
  fileHandle: FileSystemFileHandle;
}

export const transferFileWithWebWorker = async (
  data: FileWorkerData
): Promise<boolean> => {
  return new Promise((res, rej) => {
    const worker = new Worker(
      new URL("./workers/fileTransferWorker.ts", import.meta.url)
    );
    worker.onmessage = ({ data }) => {
      worker.terminate();
      res(data);
    };
    worker.postMessage(data);
  });
};
