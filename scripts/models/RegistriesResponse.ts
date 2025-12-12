import type { IRegistryInfo } from "./IRegistryInfo.ts";
export interface RegistriesResponse {
  registries: IRegistryInfo[];
  defaultRegistryId?: string;
}
