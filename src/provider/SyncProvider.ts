import IKernelProvider from '../interfaces/IKernelProvider';

/**
 * A provider that handles syncing between providers
 *
 * @class Provider
 * @implements {IKernelProvider}
 */
class SyncProvider implements IKernelProvider {
    mainProvider: IKernelProvider;

    syncProviders: IKernelProvider[];

    constructor(mainProivder: IKernelProvider, syncProviders: IKernelProvider[]) {
        this.mainProvider = mainProivder;
        this.syncProviders = syncProviders;
    }

    async init(keys: string) {
        const initPromises = this.syncProviders.map((provider) => provider.init(keys));

        await this.mainProvider.init(keys);
        await Promise.all(initPromises);
    }

    async fetchFile(id: string) {
        return this.mainProvider.fetchFile(id);
    }

    async storeFile(data: Buffer, path: string) {
        this.syncProviders.map((provider) => provider.storeFile(data, path));

        return this.mainProvider.storeFile(data, path);
    }
}

export default SyncProvider;
