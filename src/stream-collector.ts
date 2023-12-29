import { arrayBuffer } from "node:stream/consumers";

import type { StreamCollector } from "@smithy/types";

/* eslint-disable func-style */
export const streamCollector: StreamCollector = async (stream) => {
  return new Uint8Array(await arrayBuffer(stream));
};
