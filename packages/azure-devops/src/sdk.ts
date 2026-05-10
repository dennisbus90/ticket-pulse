import * as SDK from "azure-devops-extension-sdk";

let initialized = false;

export async function initSDK(): Promise<void> {
  if (initialized) return;
  await Promise.race([
    SDK.init({ loaded: true }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("SDK.init() timed out after 10s")),
        10000,
      ),
    ),
  ]);
  await SDK.ready();
  initialized = true;
}

export { SDK };
