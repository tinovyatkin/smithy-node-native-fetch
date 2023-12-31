import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { MockAgent } from "undici";

import * as nativeFetchHandler from "../dist/index.js";

describe("Network requests", () => {
  const mockAgent = new MockAgent();
  // https://github.com/nodejs/undici/discussions/2167
  globalThis[Symbol.for("undici.globalDispatcher.1")] = mockAgent;
  const s3 = new S3Client({
    credentials: { accessKeyId: randomUUID(), secretAccessKey: randomUUID() },
    region: "us-east-1",
    ...nativeFetchHandler,
  });
  const bucketName = "test-bucket";
  const mockPool = mockAgent.get(
    `https://${bucketName}.s3.us-east-1.amazonaws.com`,
  );

  before(() => {
    mockAgent.disableNetConnect();
  });

  after(() => {
    mockAgent.enableNetConnect();
  });

  test("s3 client GetObject", async () => {
    const testKey = "test-object-key";
    const objectBody = randomUUID().repeat(10);

    mockPool
      .intercept({
        path: `/${testKey}`,
        method: "GET",
        query: { "x-id": "GetObject" },
      })
      .reply(200, objectBody);

    const res = await s3.send(
      new GetObjectCommand({ Bucket: bucketName, Key: testKey }),
    );
    assert.equal(await res.Body.transformToString(), objectBody);
  });

  test("s3 client PutObject", async () => {
    const testKey = "test-object-key";
    const objectBody = randomUUID().repeat(10);

    mockPool
      .intercept({
        path: `/${testKey}`,
        method: "PUT",
        query: { "x-id": "PutObject" },
      })
      .reply(200, "", {
        headers: {
          ETag: "test-etag",
          "x-amz-id-2": "test_id_2",
          "x-amz-request-id": "test_request_id",
        },
      });

    const res = await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: objectBody,
      }),
    );
    assert.equal(res.ETag, "test-etag");
  });
});
