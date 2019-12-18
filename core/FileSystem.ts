import WasmFs from '@wasmer/wasmfs';
import WasmFsType from '@wasmer/wasmfs';
import { TFileId, IReadFileOptions, TData, TFilePath, TMode, IMkdirOptions, TCallback, TFlags } from 'memfs/lib/volume';
import { TDataOut, TEncodingExtended } from 'memfs/lib/encoding';
import stringToBytes from '../services/stringToBytes';
import Registry from './Registry';
import IKernelProvider from '../interfaces/IKernelProvider';
import WasmParser from './WasmParser';
import Dirent from 'memfs/lib/Dirent';
import createDefaultDirectoryStructure from '../services/createDefaultDirectoryStructure';

interface FileSystemDirOptions {
    encoding?: TEncodingExtended;
    withFileTypes?: boolean;
    ignoreDotFiles?: boolean;
}

class FileSystem {
    private registry: Registry;

    private provider: IKernelProvider;

    // Mapping of path -> location of file
    private mapping: {[ key: string ]: any};
    private mappingSynced: boolean = true;
    private mappingSyncIntervalId: any;

    public wasmFs: WasmFsType;

    constructor(registry: Registry, provider: IKernelProvider) {
        this.registry = registry;
        this.wasmFs = new WasmFs();
        this.provider = provider;
    }

    async init() {
        this.coupleFsToProvider();

        const fileSystemMapId = await this.registry.get<string>('fs_map');
        this.mappingSyncIntervalId = setInterval(this.synchroniseFileMap.bind(this), 5000);

        // I know this is dirty, but the "this" is required in fromJSON
        // with self we can access our class
        const self = this;
        const originalFromJson = this.wasmFs.fromJSON;
        this.wasmFs.fromJSON = function (fsJson: any) {
            // Sadly the WASM terminal resets the filesystem, we have to overwrite the function
            // to couple our file system again
            // NOTICE: It's very possible this will result in a race condition
            const result = originalFromJson.call(this, fsJson);
            self.coupleFsToProvider();
            return result;
        }

        if (!fileSystemMapId) {
            const fsBundle = this.wasmFs.toJSON();
            const fileId = await this.provider.storeFile(Buffer.from(stringToBytes(JSON.stringify(fsBundle))), '/.fs_map');

            await this.registry.set('fs_map', fileId, false);

            this.mapping = fsBundle;
            this.provider.setMapping(fsBundle);

            // Create our default folders
            await createDefaultDirectoryStructure(this);
            await WasmParser.createDefaultApps(this);
        } else {
            const fileMapRaw = (await this.provider.fetchFile(fileSystemMapId)).toString();
            const fileMap = JSON.parse(fileMapRaw);

            this.mapping = fileMap;
            this.wasmFs.fromJSON(fileMap);
            this.provider.setMapping(fileMap);
        }
    }

    coupleFsToProvider() {
        // Object.keys(this.wasmFs.fs).forEach((key) => {
        //     const originalFunction = this.wasmFs.fs[key];

        //     this.wasmFs.fs[key] = (...args: any[]) => {
        //         console.log('[Fs] !!!! Not implemented: ', key);
        //         return originalFunction(...args);
        //     }
        // });

        // VERGEET NIET de 0 en args weg te halen!!!!!
        const originalOpenSync = this.wasmFs.fs.openSync;
        this.wasmFs.fs.openSync = (...args: any[]) => {
            // @ts-ignore
            return originalOpenSync(args[0], 0);
            // return originalOpenSync(...args);
        }

        const originalWriteFile = this.wasmFs.fs.writeFile;
        // @ts-ignore
        this.wasmFs.fs.writeFile = async (id: any, data: any, options: any, callback: any) => {
            // Resources are saved in location ids. This way virtual file systems can work aswell
            console.log('[] data -> ', id, data);
            const locationId = await this.provider.storeFile(data, id);

            // Set the mapping correctly
            this.mapping[id] = Buffer.from(stringToBytes(locationId)).toJSON();
            this.mappingSynced = false;

            // We just write the location id as the original file.
            return originalWriteFile(id, Buffer.from(stringToBytes(locationId)), options, callback);
        }

        // @ts-ignore
        this.wasmFs.fs.readFile = async (id: TFileId, options: string | IReadFileOptions, callback: any) => {
            try {
                const path = Buffer.from(this.mapping[id.toString()]).toString();
                const file = await this.provider.fetchFile(path);

                callback(null, file);
            } catch(error) {
                callback(error, null);
            }
        }

        const originalReadFileSync = this.wasmFs.fs.readFileSync;
        this.wasmFs.fs.readFileSync = (file: TFileId, options?: string | IReadFileOptions) => {
            console.log('[ReadFileSync] file -> ', file);
            return originalReadFileSync(file, options);
        }

        const originalReadSync = this.wasmFs.fs.readSync;
        this.wasmFs.fs.readSync = (...args: any[]) => {
            console.log('[NOT_IMPLEMENTED_ReadSync] args -> ', args);
            // @ts-ignore
            return originalReadSync(...args);
        }
    }

    /**
     * Synchronises the file map to the provider
     *
     * @memberof FileSystem
     */
    async synchroniseFileMap() {
        if (this.mappingSynced) {
            return;
        }

        // First tell the system we have synced. If we did this later an issue
        // could occur where a new file has been written in between syncs
        this.mappingSynced = true;

        const fileId = await this.provider.storeFile(Buffer.from(stringToBytes(JSON.stringify(this.mapping))), '/.fs_map');
        await this.registry.set('fs_map', fileId, false);
    }

    async read(fd: number, buffer: Buffer | Uint8Array, offset: number, length: number, position: number) {
        return new Promise((resolve, reject) => {
            this.wasmFs.fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(bytesRead);
                }
            });
        });
    }

    /**
     *  Reads a file from the filesystem
     *
     * @param {TFileId} id
     * @param {(string | IReadFileOptions)} [options]
     * @returns {Promise<TDataOut>}
     * @memberof FileSystem
     */
    readFile(id: TFileId, options?: string | IReadFileOptions): Promise<TDataOut> {
        return new Promise((resolve, reject) => {
            this.wasmFs.fs.readFile(id, options, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
     * Writes a file to the filesystem
     *
     * @param {TFileId} id
     * @param {TData} data
     * @returns {Promise<void>}
     * @memberof FileSystem
     */
    writeFile(id: TFileId, data: TData): Promise<void> {
        return new Promise((resolve, reject) => {
            this.wasmFs.fs.writeFile(id, data, (error: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            })
        });
    }

    /**
     * Creates a directory in the filesystem
     *
     * @param {TFilePath} path
     * @returns {Promise<void>}
     * @memberof FileSystem
     */
    makeDir(path: TFilePath, options?: TMode | IMkdirOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            this.wasmFs.fs.mkdir(path, options, (error: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Reads a directory
     *
     * @param {TFilePath} path
     * @returns {(Promise<TDataOut[] | Dirent[]>)}
     * @memberof FileSystem
     */
    readDir(path: TFilePath, options?: FileSystemDirOptions): Promise<TDataOut[] | Dirent[]> {
        return new Promise((resolve, reject) => {
            this.wasmFs.fs.readdir(path, {
                encoding: options.encoding,
                withFileTypes: options.withFileTypes,
            }, (error: any, data: any) => {
                let result = data;

                if (error) {
                    return reject(error);
                }

                if (options && options.ignoreDotFiles) {
                    if (options.withFileTypes) {
                        // @ts-ignore
                        result = result.filter((folder: Dirent) => !folder.name.toString().startsWith('.'));
                    } else {
                        // @ts-ignore
                        result = result.filter(folder => !folder.startsWith('.'));
                    }
                }

                // @ts-ignore
                resolve(result);
            })
        });
    }

    /**
     * Creates a new instance of the FileSystem and init's the system
     *
     * @static
     * @param {Registry} registry
     * @returns
     * @memberof FileSystem
     */
    static async create(registry: Registry, provider: IKernelProvider) {
        const fs = new FileSystem(registry, provider);
        await fs.init();
        return fs;
    }
}

export default FileSystem;
