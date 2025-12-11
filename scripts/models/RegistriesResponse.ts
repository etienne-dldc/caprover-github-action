import { IRegistryInfo } from "./IRegistryInfo";
export interface RegistriesResponse {
  registries: IRegistryInfo[];
  defaultRegistryId?: string;
}
