import { z } from "zod";

const ConveyorDataSchema = z.object({});
export type ConveyorData = z.infer<typeof ConveyorDataSchema>;

export default {
  id: "conveyor",
  availableShapes: ["conveyor"],
  useableAsTool: true,
  pluginDataSchema: ConveyorDataSchema,
  tickRate: 40,
};
