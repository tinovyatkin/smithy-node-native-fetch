/**
 * @see https://github.com/smithy-lang/smithy-typescript/blob/main/packages/fetch-http-handler/src/fetch-http-handler.ts
 *
 */

import assert from "node:assert/strict";
import { Readable } from "node:stream";
import streamConsumers from "node:stream/consumers";
import { ReadableStream } from "node:stream/web";

import type { SdkStream, SdkStreamMixin } from "@smithy/types";

import { streamCollector } from "./stream-collector";

const MIXIN_METHODS_NAMES: Set<string | symbol> = new Set<keyof SdkStreamMixin>(
  ["transformToByteArray", "transformToString", "transformToWebStream"],
);
const isMixinMethod = (name: string | symbol): name is keyof SdkStreamMixin =>
  MIXIN_METHODS_NAMES.has(name);

/**
 * The function that mixes in the utility functions to help consuming runtime-specific payload stream.
 *
 * @see {@link https://github.com/smithy-lang/smithy-typescript/blob/main/packages/util-stream-node/src/sdk-stream-mixin.ts}
 */
export const sdkStreamMixin = (
  stream: unknown,
): SdkStream<Readable | ReadableStream> => {
  let transformed = false;

  if (!(stream instanceof Readable) && !(stream instanceof ReadableStream))
    throw new Error("The input stream is not a valid readable stream.");

  if (!Readable.isReadable(stream as Readable))
    throw new Error("The input stream is not a readable stream.");

  return new Proxy(stream, {
    get(target, p, receiver) {
      if (!isMixinMethod(p)) return Reflect.get(target, p, receiver);

      assert.ok(!transformed, "The stream has already been transformed.");
      transformed = true;

      switch (p) {
        case "transformToByteArray":
          return async () => streamCollector(target);

        case "transformToString":
          return async (encoding?: BufferEncoding) => {
            if (
              typeof encoding === "string" &&
              ["utf8", "utf-8"].includes(encoding)
            ) {
              if (target instanceof ReadableStream) {
                const buffer = await streamConsumers.buffer(target);
                return buffer.toString(encoding);
              } else {
                target.setEncoding(encoding);
              }
            }

            return streamConsumers.text(target);
          };

        case "transformToWebStream":
          if (target instanceof ReadableStream) return () => target;
          return () => Readable.toWeb(target);
      }
    },
  }) as SdkStream<Readable | ReadableStream>;
};
