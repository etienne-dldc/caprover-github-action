import { IHashMapGeneric } from './IHashMapGeneric';
export interface IOneClickAppIdentifier {
    sortScore?: number;
    isOfficial?: boolean;
    name: string;
    displayName: string;
    description: string;
    logoUrl: string;
    baseUrl: string;
}
export interface IOneClickVariable {
    id: string;
    label: string;
    defaultValue?: string;
    validRegex?: string;
    description?: string;
}
export interface IDockerComposeService {
    image?: string;
    volumes?: string[];
    ports?: string[];
    environment?: IHashMapGeneric<string>;
    depends_on?: string[];
    hostname?: string;
    cap_add?: string[];
    command?: string | string[];
    caproverExtra?: {
        dockerfileLines?: string[];
        containerHttpPort: number;
        notExposeAsWebApp: boolean;
        websocketSupport: boolean;
    };
}
export interface IOneClickTemplate {
    services: IHashMapGeneric<IDockerComposeService>;
    captainVersion: number;
    caproverOneClickApp: {
        instructions: {
            start: string;
            end: string;
        };
        displayName: string;
        variables: IOneClickVariable[];
    };
}
