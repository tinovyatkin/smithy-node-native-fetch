import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import * as smithyNativeFetch from "smithy-node-native-fetch";

const s3 = new S3Client({ retryMode: "adaptive", ...smithyNativeFetch });
const Bucket = process.env.BUCKET_NAME;
assert.ok(Bucket, "Bucket name is required but not passed in env");

export async function handler(_event, _context) {
  const Key = randomUUID() + ".txt";
  const Body = randomUUID().repeat(1000);
  await s3.send(new PutObjectCommand({ Bucket, Key, Body }));
  // getting it back
  const res = await s3.send(new GetObjectCommand({ Bucket, Key }));
  const resBody = await res.Body.transformToString();
  assert.equal(Body, resBody);
  return "OK";
}
