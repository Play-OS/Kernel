export default interface IKernelProvider {
    init(keys: string): Promise<void>;
    setMapping(mapping: { [key: string]: any }): Promise<void>;
    setMappingListener(listener: (mapping: { [key: string]: any }) => void): void;

    storageSet(key: string, value: string): Promise<void>;
    storageGet(key: string): Promise<string>;

    storeFile(data: Buffer, path?: string): Promise<string>;
    fetchFile(id: string): Promise<Buffer>;
}
