import { IAppDef } from "./AppDefinition";
export interface AppDefinitionsResponse {
  appDefinitions: IAppDef[];
  rootDomain: string;
  captainSubDomain: string;
  defaultNginxConfig: string;
}
