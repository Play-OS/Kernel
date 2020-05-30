import { appConfig } from './Configuration';
import { AuthenticationRequest } from '../models/Authentication';
import packageJson from '../package.json';

function isUserLoggedIn(): boolean {
    return false;
}

function redirectToLogin(): void {
    const request: AuthenticationRequest = {
        domain_name: appConfig.appDomain,
        manifest_uri: appConfig.manifestUri,
        redirect_uri: appConfig.redirectUri,
        scopes: appConfig.scopes,
        version: packageJson.version,
    };

    const encodedRequest = btoa(JSON.stringify(request));
    const authenticationUri = new URL(appConfig.authenticatorUri);
    authenticationUri.searchParams.append('authRequest', encodedRequest);

    location.href = authenticationUri.href;
}

function logout() {

}


export {
    isUserLoggedIn,
    redirectToLogin,
    logout,
}
