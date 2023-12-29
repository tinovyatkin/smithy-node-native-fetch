# smithy-node-native-fetch

Node.js 18+ optimized native fetch support for Smithy clients like AWS SDK v3

## Why

Smithy (and so AWS SDK) provides `fetch` request handler only for browsers with a lot of compatibility workarounds and yet it doesn't work in modern Node.js runtimes with native global `fetch` and web streams support.

Node 18+ `fetch` is based on [undici](https://undici.nodejs.org/#/) which benchmarks as top performing HTTP/1 client for Node. In additional, using native `fetch` with AWS SDK allow to prepare to the moment when in Node.js `response.Body` may be a standard web stream also.

This handler also allows you to use modern request mocking tooling such as [msw 2.x](https://mswjs.io/) or [undici global dispatcher](https://undici.nodejs.org/#/docs/api/MockAgent).

## Usage

Simplest way with default settings (keepAlive is enabled and no timeout set) is as below:

```ts
import { S3Client } from '@aws-sdk/client-s3'
import * as nodeNativeFetch from 'smithy-node-native-fetch'

const s3 = new S3Client( {
    retryMode: 'adaptive', // or whatever else settings
    ...nodeNativeFetch
})
```

If you want to customize settings then use specific imports:

```ts
import { S3Client } from '@aws-sdk/client-s3'
import { sdkStreamMixin, streamCollector, NodeNativeFetchHttpHandler } from './fetch-http-handler'

const s3 = new S3Client( {
    retryMode: 'adaptive', // or whatever else settings
    requestHandler: new NodeNativeFetchHttpHandler({
        requestTimeout: 5000, // default is no timeout
        keepAlive: true // default is false
    }),
    sdkStreamMixin,
    streamCollector
})
```