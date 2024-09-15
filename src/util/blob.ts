/* Utility functions to convert the string returned from the use-file-system package into a File instance */
export const fromBlob = (content: string, mimeType: string): Blob => {
  const encoder = new TextEncoder();
  const byteArray = encoder.encode(content);
  return new Blob([byteArray], { type: mimeType });
};
export const toDataUrl = async (file: File | Blob): Promise<string> => {
  return new Promise((res, rej) => {
    const worker = new Worker(new URL("./workers/dataUrlWorker.ts", import.meta.url));
    worker.onmessage = ({ data }) => {
      worker.terminate();
      res(data);
    };
    worker.postMessage(file);
  });
};
