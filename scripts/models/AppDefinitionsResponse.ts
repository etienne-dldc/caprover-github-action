import type { IAppDef } from "./AppDefinition.ts";
export interface AppDefinitionsResponse {
  appDefinitions: IAppDef[];
  rootDomain: string;
  captainSubDomain: string;
  defaultNginxConfig: string;
}
