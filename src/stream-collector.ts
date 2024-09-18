import { arrayBuffer } from "node:stream/consumers";

import type { StreamCollector } from "@smithy/types";

export const streamCollector: StreamCollector = async (stream) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return new Uint8Array(await arrayBuffer(stream));
};
