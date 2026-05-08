import { resolve } from "node:path";
import {
  DefaultResourceLoader,
  SettingsManager,
  type LoadExtensionsResult,
} from "@earendil-works/pi-coding-agent";

export interface BrowserLoaderOptions {
  cwd: string;
  agentDir: string;
  extensionEntryPath: string;
}

function filterNestedWebAgent(
  result: LoadExtensionsResult,
  extensionEntryPath: string,
): LoadExtensionsResult {
  const blockedPath = resolve(extensionEntryPath);
  return {
    ...result,
    extensions: result.extensions.filter((extension) => {
      return resolve(extension.resolvedPath) !== blockedPath;
    }),
  };
}

export async function createBrowserResourceLoader({
  cwd,
  agentDir,
  extensionEntryPath,
}: BrowserLoaderOptions): Promise<DefaultResourceLoader> {
  const settingsManager = SettingsManager.create(cwd, agentDir);
  const loader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
    extensionsOverride: (result) =>
      filterNestedWebAgent(result, extensionEntryPath),
  });

  await loader.reload();
  return loader;
}
