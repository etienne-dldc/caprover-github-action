export interface IAutomatedCleanupConfigs {
    mostRecentLimit: number;
    cronSchedule: string;
    timezone: string;
}
export declare class AutomatedCleanupConfigsCleaner {
    static sanitizeInput(instance: IAutomatedCleanupConfigs): {
        mostRecentLimit: number;
        cronSchedule: string;
        timezone: string;
    };
}
