import { z } from "zod";
import { PluginConfig } from "../base";

// Use zod (https://zod.dev/) to construct a type that represents the data structure saved by the plugin
// e.g. for a File plugin this would be directoryName, fileName etc.
// You can save this data in a plugin and it will be attached to the shape
// This data structure is also what gets returned as "data" in some instance methods
export const TemplateDataSchema = z.object({});
export type TemplateData = z.infer<typeof TemplateDataSchema>;

// Defines the plugins properties
export default {
  id: "template",
  availableShapes: ["rect"],
  useableAsTool: true,
  pluginDataSchema: TemplateDataSchema,
} as PluginConfig;
