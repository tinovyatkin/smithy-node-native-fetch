import { NodeNativeFetchHttpHandler } from "./node-native-fetch-handler";
export * from "./node-native-fetch-handler";
export * from "./sdk-stream-mixin";
export * from "./stream-collector";

export const requestHandler = new NodeNativeFetchHttpHandler({
  keepAlive: true,
});
