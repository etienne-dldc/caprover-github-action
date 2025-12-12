import type { RepoInfo } from "./AppDefinition.ts";
export interface IImageSource {
  uploadedTarPathSource?: {
    uploadedTarPath: string;
    gitHash: string;
  };
  captainDefinitionContentSource?: {
    captainDefinitionContent: string;
    gitHash: string;
  };
  repoInfoSource?: RepoInfo;
}
