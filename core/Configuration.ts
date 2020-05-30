import { Permission } from "../models/Permissions";

export interface Configuration {
    scopes: Permission[];
    appDomain: string;
    redirectUri: string;
    manifestUri: string;
    authenticatorUri: string;
    coreNode: string;
}

interface ConfigProps extends Partial<Configuration> {};

let appConfig: Configuration = {
    appDomain: window.location.origin,
    manifestUri: '/manifest.json',
    redirectUri: window.location.origin,
    scopes: [],
    authenticatorUri: 'https://os.playos.io/#/auth',
    coreNode: 'https//core.playos.io/',
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
