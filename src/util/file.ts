import { PluginAttachment } from "@/plugins/base";
import plugin from "@/plugins/folder/plugin";

export const getFile = (attachment: PluginAttachment): FileSystemFileHandle | undefined => {
    return attachment.sourceShape && plugin.getHandle(attachment.sourceShape, attachment.name, attachment.extension);
}