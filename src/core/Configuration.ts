import { Permission } from "../models/Permissions";
import isNodeJs from "../services/isNodeJs";

export interface Configuration {
    scopes: Permission[];
    appDomain: string;
    redirectUri: string;
    manifestUri: string;
    authenticatorUri: string;
    coreNode: string;
    processWorkerUrl: string;
    fsWorkerUrl: string;
}

interface ConfigProps extends Partial<Configuration> {};

let appConfig: Configuration = {
    appDomain: isNodeJs() ? '' : window.location.origin,
    manifestUri: '/manifest.json',
    redirectUri: isNodeJs() ? '' : window.location.origin,
    scopes: [],
    authenticatorUri: 'https://os.playos.io/#/auth',
    coreNode: 'https//core.playos.io/',
    processWorkerUrl: './build/process.worker.js',
    fsWorkerUrl: './build/filesystem.worker.js',
};

function setConfig(config: ConfigProps): void {
    appConfig = {
        ...appConfig,
        ...config,
    };
}

export {
    setConfig,
    appConfig,
}
