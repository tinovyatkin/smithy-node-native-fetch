/**
 * @see https://github.com/smithy-lang/smithy-typescript/blob/main/packages/fetch-http-handler/src/fetch-http-handler.ts
 */

import { Readable } from "node:stream";
import { URL } from "node:url";

import {
  type HttpHandler,
  type HttpRequest,
  type HttpResponse,
} from "@smithy/protocol-http";
import type {
  FetchHttpHandlerOptions,
  HeaderBag,
  HttpHandlerOptions,
  Provider,
} from "@smithy/types";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access */
let __HttpResponse: typeof HttpResponse;
try {
  __HttpResponse = require("@smithy/protocol-http").HttpResponse;
} catch {
  __HttpResponse = require("@aws-sdk/protocol-http").HttpResponse;
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access */

type FetchHttpHandlerConfig = FetchHttpHandlerOptions;

/**
 * @public
 *
 * HttpHandler implementation using browsers' `fetch` global function.
 */
export class NodeNativeFetchHttpHandler
  implements HttpHandler<FetchHttpHandlerConfig>
{
  private config?: FetchHttpHandlerConfig;
  private configProvider: Promise<FetchHttpHandlerConfig>;

  /**
   * @returns the input if it is an HttpHandler of any class,
   * or instantiates a new instance of this handler.
   */
  public static create(
    instanceOrOptions?:
      | FetchHttpHandlerOptions
      | HttpHandler<object>
      | Provider<FetchHttpHandlerOptions | void>,
  ) {
    if (
      instanceOrOptions &&
      "handle" in instanceOrOptions &&
      typeof instanceOrOptions.handle === "function"
    )
      // is already an instance of HttpHandler.
      return instanceOrOptions;

    // input is ctor options or undefined.
    return new NodeNativeFetchHttpHandler(
      instanceOrOptions as FetchHttpHandlerConfig,
    );
  }

  constructor(
    options?:
      | FetchHttpHandlerOptions
      | Provider<FetchHttpHandlerOptions | void>,
  ) {
    if (typeof options === "function") {
      this.configProvider = options().then((opts) => opts || {});
    } else {
      this.config = options ?? {};
      this.configProvider = Promise.resolve(this.config);
    }
  }

  destroy(): void {
    // Do nothing.
  }

  async handle(
    request: HttpRequest,
    { abortSignal }: HttpHandlerOptions = {},
  ): Promise<{ response: HttpResponse }> {
    this.config ??= await this.configProvider;

    const uri = new URL(
      `${request.protocol}//${request.hostname}${request.path}`,
    );

    if (request.port) uri.port = request.port.toString();
    if (request.username != null) uri.username = request.username;
    if (request.password != null) uri.password = request.password;
    if (request.fragment) uri.hash = request.fragment;
    if (request.query) {
      for (const [key, value] of Object.entries(request.query)) {
        if (value == null) continue;

        if (Array.isArray(value))
          for (const item of value) uri.searchParams.append(key, item);
        else uri.searchParams.append(key, value);
      }
    }

    const headers = new Headers(request.headers);
    headers.delete("expect"); // not supported by node fetch

    const { method } = request;
    const requestOptions: RequestInit = {
      headers,
      method,
      signal: abortSignal as AbortSignal,
      keepalive: this.config.keepAlive === true,
      redirect: "manual",
    };
    if (request.body && method !== "GET" && method !== "HEAD") {
      if (request.body instanceof Readable)
        requestOptions.body = Readable.toWeb(request.body);
      else requestOptions.body = request.body;
    }

    const requestTimeoutInMs = this.config.requestTimeout;
    if (requestTimeoutInMs) {
      if (requestOptions.signal) {
        // AbortSignal.any is supported since Node 20.3.0
        if ("any" in AbortSignal && typeof AbortSignal.any === "function") {
          requestOptions.signal = AbortSignal.any([
            requestOptions.signal,
            AbortSignal.timeout(requestTimeoutInMs),
          ]);
        }
      } else {
        requestOptions.signal = AbortSignal.timeout(requestTimeoutInMs);
      }
    }

    const response = await fetch(uri, requestOptions);

    const transformedHeaders: HeaderBag = Object.fromEntries(
      response.headers.entries(),
    );

    // Check for undefined as well as null.
    const hasReadableStream = response.body != undefined;

    // Return the response with buffered body
    if (!hasReadableStream) {
      const body = await response.blob();

      return {
        response: new __HttpResponse({
          headers: transformedHeaders,
          reason: response.statusText,
          statusCode: response.status,
          body: body.stream(),
        }),
      };
    }

    // Return the response with streaming body
    return {
      response: new __HttpResponse({
        headers: transformedHeaders,
        reason: response.statusText,
        statusCode: response.status,
        body: response.body,
      }),
    };
  }

  updateHttpClientConfig(
    key: keyof FetchHttpHandlerConfig,
    value: FetchHttpHandlerConfig[typeof key],
  ): void {
    this.config = undefined;
    this.configProvider = this.configProvider.then((config) => {
      (config as Record<typeof key, typeof value>)[key] = value;

      return config;
    });
  }

  httpHandlerConfigs(): FetchHttpHandlerConfig {
    return this.config ?? {};
  }
}
