import { lookup } from "mime-types";

// This just changes the return type from string | false to string | undefined
export const getMimeType = (extension: string) => (lookup(extension) || undefined)?.split('/')[0];