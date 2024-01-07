import * as lambda from "aws-cdk-lib/aws-lambda";
import { Stack, type IAspect } from "aws-cdk-lib/core";
import { type Construct, type IConstruct } from "constructs";
import * as path from "node:path";

const compatibleRuntimes: lambda.Runtime[] = [
  lambda.Runtime.NODEJS_18_X,
  lambda.Runtime.NODEJS_20_X,
];

/**
 * An AWS Lambda layer that includes the NPM dependency `smithy-node-native-fetch`.
 */
export class SmithyNodeNativeFetchLayer extends lambda.LayerVersion {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      compatibleRuntimes,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, "../dist/lambda-layer/"),
      ),
      description: "/opt/nodejs/node_modules/smithy-node-native-fetch",
    });
  }
}

/**
 * Adds the `SmithyNodeNativeFetchLayer` to all Lambda functions with supported runtimes
 * in the scope, using a singleton layer.
 */
export class SmithyNodeNativeAspect implements IAspect {
  public visit(node: IConstruct): void {
    if (
      node instanceof lambda.Function &&
      compatibleRuntimes.some((r) => r.runtimeEquals(node.runtime))
    ) {
      const LAYER_ID = "SmithyNodeNativeFetchLayer325ban"; // random enough
      let topStack = Stack.of(node);
      while (topStack.nestedStackParent) topStack = topStack.nestedStackParent;

      const layer =
        (topStack.node.tryFindChild(LAYER_ID) as
          | SmithyNodeNativeFetchLayer
          | undefined) ?? new SmithyNodeNativeFetchLayer(topStack, LAYER_ID);
      node.addLayers(layer);
    }
  }
}
