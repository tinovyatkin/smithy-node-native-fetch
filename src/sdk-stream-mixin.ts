/**
 * @see https://github.com/smithy-lang/smithy-typescript/blob/main/packages/fetch-http-handler/src/fetch-http-handler.ts
 *
 */

import { Readable } from "node:stream";
import streamConsumers from "node:stream/consumers";
import { ReadableStream } from "node:stream/web";

import type { SdkStream } from "@smithy/types";

import { streamCollector } from "./stream-collector";

const assertTransformOnce = (stream: object) => {
  if ("transformed" in stream)
    throw new Error("The stream has already been transformed.");
  Object.defineProperty(stream, "transformed", { value: true });
};

/**
 * The function that mixes in (mutates) the utility functions to help consuming runtime-specific payload stream.
 *
 * @see {@link https://github.com/smithy-lang/smithy-typescript/blob/main/packages/util-stream-node/src/sdk-stream-mixin.ts}
 */
export const sdkStreamMixin = (
  stream: unknown,
): SdkStream<Readable | ReadableStream> => {
  if (!(stream instanceof Readable) && !(stream instanceof ReadableStream))
    throw new Error("The input stream is not a valid readable stream.");

  if (!Readable.isReadable(stream as Readable))
    throw new Error("The input stream is not a readable stream.");

  return Object.assign(stream, {
    async transformToByteArray() {
      assertTransformOnce(stream);
      return streamCollector(stream);
    },

    async transformToString(encoding?: BufferEncoding) {
      assertTransformOnce(stream);
      if (
        typeof encoding === "string" &&
        !["utf8", "utf-8"].includes(encoding)
      ) {
        if (stream instanceof ReadableStream) {
          const buffer = await streamConsumers.buffer(stream);
          return buffer.toString(encoding);
        } else {
          stream.setEncoding(encoding);
        }
      }
      return streamConsumers.text(stream);
    },

    transformToWebStream() {
      if (stream instanceof ReadableStream) return stream;
      assertTransformOnce(stream);
      return Readable.toWeb(stream);
    },
  }) as SdkStream<Readable | ReadableStream>;
};
