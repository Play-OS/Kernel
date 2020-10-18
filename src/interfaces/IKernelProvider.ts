export default interface IKernelProvider {
    init(keys: string): Promise<void>;
    // setMapping(mapping: { [key: string]: any }): Promise<void>;
    // setMappingListener(listener: (mapping: { [key: string]: any }) => void): void;

    storeFile(data: Buffer, path: string): Promise<string>;
    fetchFile(id: string): Promise<Buffer | null>;
}
