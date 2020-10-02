import { appConfig } from './Configuration';
import { AuthenticationRequest, AuthenticationResponse, AuthenticationErrors } from '../models/Authentication';
import packageJson from '../../package.json';
import { popupCenter, listenForWindowClose } from '../services/PopupWindow';

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

function showLoginPrompt(onAuthResponse: (res: AuthenticationResponse) => void): void {
    if (!onAuthResponse) {
        throw new Error('Missing onAuthResponse param');
    }

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

    const popupWindow = popupCenter({
        url: authenticationUri.href,
        title: 'Login',
        h: 531,
        w: 442,
    });

    if (!popupWindow) {
        // TODO: Popup blocked? Use the redirect_uri
        onAuthResponse({
            error: AuthenticationErrors.AccessDenied,
        });
        return;
    }

    // Keep the window alive and make sure PlayOS receives a targer
    const heartbeatIntervalId = setInterval(() => {
        if (popupWindow) {
            popupWindow.postMessage('💓', '*');
        }
    }, 200);

    listenForWindowClose(popupWindow, () => {
        clearInterval(heartbeatIntervalId);
        onAuthResponse({
            error: AuthenticationErrors.AccessDenied,
        });
    });

    window.addEventListener('message', (event) => {
        if (!event.data || event.data.type !== 'auth') {
            return;
        }

        const message: AuthenticationResponse = event.data;

        console.log('[] message -> ', message);
    });
}

function logout() {

}


export {
    isUserLoggedIn,
    redirectToLogin,
    showLoginPrompt,
    logout,
}
