import { bootKernel } from './Kernel';
import BrowserProvider from './provider/BrowserProvider';
import RutileProvider from './provider/RutileProvider';
import SyncProvider from './provider/SyncProvider';
import MessageProvider from './provider/MessageProvider';
import * as auth from './core/Authentication';
import * as config from './core/Configuration';

const providers = {
    BrowserProvider,
    RutileProvider,
    SyncProvider,
    MessageProvider,
}

if (typeof window !== 'undefined') {
    // @ts-ignore
    window.PlayOS = {
        auth,
        config,
        bootKernel,
        providers,
    };
}

export {
    auth,
    config,
    bootKernel,
    providers,
}
