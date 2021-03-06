import WasmFs from '@wasmer/wasmfs';
import WasmFsType from '@wasmer/wasmfs';
import { TFileId, IReadFileOptions, TData, TMode, IMkdirOptions } from 'memfs/lib/volume';
import { TDataOut, TEncodingExtended } from 'memfs/lib/encoding';
import { EventEmitter } from 'events';

import stringToBytes, { bytesToString } from '../services/stringToBytes';
import Registry from './Registry';
import IKernelProvider from '../interfaces/IKernelProvider';
import WasmParser from './WasmParser';
import Dirent from 'memfs/lib/Dirent';
import createDefaultDirectoryStructure from '../services/createDefaultDirectoryStructure';
import getValueFromMapping from '../services/getValueFromMapping';
import { PathLike } from 'fs';
import WorkerMessageProvider from '../provider/WorkerMessageProvider';

interface OpenFiles {
    [fd: number]: string;
};

interface FileSystemDirOptions {
    encoding?: TEncodingExtended;
    withFileTypes?: boolean;
    ignoreDotFiles?: boolean;
}

export interface FsMapping {
    [key: string]: any;
}

const SKIP_FOLDERS = [
    '/_wasmer',
    '/dev',
];

const CONSOLE_FD = [
    0,
    1,
    2,
];

function isInSkipFolder(path: string): boolean {
    return !!SKIP_FOLDERS.find((folder) => path.startsWith(folder));
}

class FileSystem extends EventEmitter {
    private provider: WorkerMessageProvider;

    // Mapping of path -> location of file
    public mapping: FsMapping;
    private mappingSyncIntervalId: any;
    private mappingSynced: boolean = true;
    private openFiles: OpenFiles = {};

    public wasmFs: WasmFsType;

    constructor(provider: WorkerMessageProvider) {
        super();

        this.wasmFs = new WasmFs();
        this.provider = provider;
        this.mapping = {};
    }

    async init() {
        this.coupleFsToProvider();

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

        // Create our default folders
        await createDefaultDirectoryStructure(this);
        await WasmParser.createDefaultApps(this);

        const fsBundle = this.wasmFs.toJSON();
        const fileId = this.provider.storeFileSync(Buffer.from(stringToBytes(JSON.stringify(fsBundle))), '/.fs_map');

        this.mapping = fsBundle;
    }

    coupleFsToProvider() {
        const originalOpenSync = this.wasmFs.fs.openSync;
        this.wasmFs.fs.openSync = (...args: any[]) => {
            // console.debug('🗂 Calling openSync', args);
            const path = args[0];

            if (!isInSkipFolder(path)) {
                // const mapping = this.wasmFs.toJSON();
                // mapping[path] =
            }

            // @ts-ignore
            const fd = originalOpenSync(...args);
            this.openFiles[fd] = path;
            return fd;
        }

        const originalWriteFile = this.wasmFs.fs.writeFile;
        // @ts-ignore
        this.wasmFs.fs.writeFile = async (id: any, data: any, options: any, callback: any) => {
            // Resources are saved in location ids. This way virtual file systems can work aswell
            // console.debug('🗂 Calling writeFile', [id, data, options, callback]);
            const locationId = this.provider.storeFileSync(data, id);

            // Set the mapping correctly
            this.mapping[id] = Buffer.from(stringToBytes(locationId)).toJSON();
            this.mappingSynced = false;

            // We just write the location id as the original file.
            return originalWriteFile(id, Buffer.from(stringToBytes(locationId)), options, callback);
        }

        const originalReadFile = this.wasmFs.fs.readFile;
        // @ts-ignore
        this.wasmFs.fs.readFile = async (id: TFileId, options: IReadFileOptions | string, callback: any) => {
            try {
                // console.debug('🗂 Calling readFile', [id, options, callback]);
                // Device calls should not be interfered with
                if (id.toString().startsWith('/dev') || id.toString().startsWith('dev')) {
                    if (options) {
                        // @ts-ignore
                        return originalReadFile(id, options, callback);
                    }

                    return originalReadFile(id, callback);
                }

                const pathMappingValue = getValueFromMapping(id.toString(), this.mapping);
                if (!pathMappingValue) {
                    throw new Error(`Path ${id} could not be retrieved from mapping`);
                }

                const path = pathMappingValue.toString();
                const file = this.provider.fetchFileSync(path);

                callback(null, file);
            } catch(error) {
                callback(error, null);
            }
        }

        const originalWriteSync = this.wasmFs.fs.writeSync;
        this.wasmFs.fs.writeSync = (...args: any[]) => {
            console.debug('🗂 Calling writeSync', ...args);
            const fd = args[0];

            if (CONSOLE_FD.includes(fd)) {
                this.emit('message', args[1]);
            } else {
                // console messages should not be written to the disk
                this.provider.storeFileSync(args[1], this.openFiles[fd]);
            }

            // @ts-ignore
            return originalWriteSync(...args);
        };

        const originalReadSync = this.wasmFs.fs.readSync;
        this.wasmFs.fs.readSync = (...args: any[]) => {
            console.debug('🗂 Calling readSync', ...args);
            const fd: number = args[0];
            const buffer: Buffer = args[1];
            const offset: number = args[2];
            const lengthToRead: number = args[3];

            const fileValue = this.provider.fetchFileSync(this.openFiles[fd]);

            if (fileValue) {
                buffer.set(fileValue, offset);
                console.log('[] lengthToRead -> ', lengthToRead);
                console.log('[] buffer -> ', buffer);

                // @TODO Write the length correctly (fd_read)
                // return 0;
                // return buffer.length;
                // return 0;
                // return fileValue.length;
            }


            // if (CONSOLE_FD.includes(fd)) {
            //     this.emit('message', args[1]);
            // } else {
            //     // console messages should not be written to the disk
            //     this.provider.storeFileSync(args[1], this.openFiles[fd]);
            // }

            // @ts-ignore
            const result = originalReadSync(...args);
            console.log('[] result -> ', result);
            return result;
        };

        const originalRead = this.wasmFs.fs.read;
        this.wasmFs.fs.read = async (...args: any[]) => {
            // console.debug('🗂 Calling read', args);
            // fd under 5 is one of the /dev/ files
            if (args[0] < 5) {
                // @ts-ignore
                return originalRead(...args);
            }

            const callback = args[5];
            const file = await this.readFile(this.openFiles[args[0]], {
                encoding: 'buffer',
            }) as Buffer;

            if (!file) {
                return callback('No File found', null);
            }

            // We need to write to the correct position
            const position: number = args[4] === null ? 0 : args[4];
            const inputBuffer: Buffer = args[1];
            const maxLengthToWrite: number = args[3];
            const bytesLength = file.length;

            // Short circuit on no file lengths
            if (file.length === 0) {
                callback(null, bytesLength);
            }

            // Writing per byte bases. Making sure it gets the exact length it requested for
            for (let i = position; i < maxLengthToWrite; i++) {
                // We gone behond
                if (i > file.length) {
                    break;
                }

                // It possible that the read value is not available
                inputBuffer.set([file.readUInt8(i)], i);
            }

            return callback(null, bytesLength);
        }

        const originalStatSync = this.wasmFs.fs.statSync;
        this.wasmFs.fs.statSync = (...args: any) => {
            // console.debug('🗂 Calling statSync', args);
            // @ts-ignore
            return originalStatSync(...args);
        };

        const originalFstatSync = this.wasmFs.fs.fstatSync;
        this.wasmFs.fs.fstatSync = (...args: any) => {
            // console.debug('🗂 Calling fstatSync', args);
            // @ts-ignore
            return originalFstatSync(...args);
        }
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
        if (!id) {
            throw new Error(`Invalid argument id ${id}`);
        }

        return new Promise((resolve, reject) => {
            // @ts-ignore
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
     * @param {PathLike} path
     * @returns {Promise<void>}
     * @memberof FileSystem
     */
    makeDir(path: PathLike, options?: TMode | IMkdirOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            // @ts-ignore
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
     * @param {PathLike} path
     * @returns {(Promise<TDataOut[] | Dirent[]>)}
     * @memberof FileSystem
     */
    readDir(path: PathLike, options?: FileSystemDirOptions): Promise<TDataOut[] | Dirent[]> {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            this.wasmFs.fs.readdir(path, {
                // @ts-ignore
                encoding: options?.encoding,
                withFileTypes: options?.withFileTypes,
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
     * Checks if the file exists or not
     *
     * @param {PathLike} path
     * @returns
     * @memberof FileSystem
     */
    exists(path: PathLike) {
        return new Promise((resolve) => {
            this.wasmFs.fs.exists(path, (exists) => {
                resolve(exists);
            })
        });
    }

    /**
     * Converts the filesystem to a mapping
     *
     * @returns
     * @memberof FileSystem
     */
    toJSON() {
        const result: any = {};

        Object.keys(this.mapping).forEach((mappingKey) => {
            result[mappingKey] = Buffer.from(mappingKey);
        });

        return result;
    }

    /**
     * Creates a new instance of the FileSystem and init's the system
     *
     * @static
     * @param {Registry} registry
     * @returns
     * @memberof FileSystem
     */
    static async create(provider: WorkerMessageProvider) {
        const fs = new FileSystem(provider);
        await fs.init();
        return fs;
    }
}

export default FileSystem;
