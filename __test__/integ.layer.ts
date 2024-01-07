import * as integ from "@aws-cdk/integ-tests-alpha";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";

import { SmithyNodeNativeAspect } from "../src/cdk";

const app = new cdk.App();
cdk.Aspects.of(app).add(new SmithyNodeNativeAspect());

const stack = new cdk.Stack(app, "smithy-native-fetch-test");

const bucket = new s3.Bucket(stack, "TestBucket", {
  bucketName: "test-smithy-native-fetch-bucket",
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const fn = new lambda.Function(stack, "Function", {
  code: lambda.Code.fromAsset("../__fixtures__/lambda/"),
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: "index.handler",
  timeout: cdk.Duration.seconds(30),
  tracing: lambda.Tracing.ACTIVE,
  environment: {
    BUCKET_NAME: bucket.bucketName,
  },
  logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
});
bucket.grantReadWrite(fn);

const integTest = new integ.IntegTest(app, "smithy-native-fetch-layer-integ", {
  testCases: [stack],
});

const invoke = integTest.assertions.invokeFunction({
  functionName: fn.functionName,
});
invoke.expect(integ.ExpectedResult.objectLike({ Payload: '"OK"' }));
