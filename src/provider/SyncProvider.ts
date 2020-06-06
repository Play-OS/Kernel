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

    async setMapping(mapping: any) {
        const setMappingPromises = this.syncProviders.map((provider) => provider.setMapping(mapping));

        await this.mainProvider.setMapping(mapping);
        await Promise.all(setMappingPromises);
    }

    setMappingListener(listener: any) {
        this.mainProvider.setMappingListener(listener);
    }

    async fetchFile(id: string) {
        return this.mainProvider.fetchFile(id);
    }

    async storeFile(data: Buffer, path: string) {
        this.syncProviders.map((provider) => provider.storeFile(data, path));

        return this.mainProvider.storeFile(data, path);
    }

    async storageGet(key: string) {
        return this.mainProvider.storageGet(key);
    }

    async storageSet(key: string, value: string) {
        this.syncProviders.map((provider) => provider.storageSet(key, value));

        await this.mainProvider.storageSet(key, value);
    }

}

export default SyncProvider;
