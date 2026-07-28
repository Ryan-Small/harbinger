import { z } from "zod";

export const StatusResponse = z.object({
    serverTime: z.iso.datetime(),
});
export type StatusResponse = z.infer<typeof StatusResponse>;
