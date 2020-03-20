import WasmFs from '@wasmer/wasmfs';
import { DirectoryJSON } from 'memfs/lib/volume';
import { createTargetedPostMessageInstance } from './helpers/postWorkerMessage';
import { callMethodOnFileSystemWorker } from './helpers/processMethodCalling';
import { bufferToNumber } from '../../services/hexUtils';
import createFsStats from '../../services/createFsStats';

interface OpenFile {
    fd: number;
    path: string;
    buffer?: Buffer;
}

const PROCESS_TARGET_NAME = 'process';
const FS_TARGET_NAME = 'fileSystem';

function isDeviceFolder(path: string): boolean {
    const SKIP_FOLDERS = [
        '/_wasmer',
    ];

    return !!SKIP_FOLDERS.find((folder) => path.startsWith(folder));
}

function getPathFromFd(fd: number, wasmFs: WasmFs) {
    return wasmFs.volume.fds[fd].link.getPath();
}

export default async function createVirtualFs(): Promise<WasmFs> {
    const postFileWorkerMessage = createTargetedPostMessageInstance(PROCESS_TARGET_NAME, FS_TARGET_NAME);

    // Requesting the file system mapping
    const fsMapping = await postFileWorkerMessage<DirectoryJSON>({
        args: [],
        type: 'getFsMapping',
    }, true);

    // We need a notifier buffer to lock/unlock the process
    // Then synchronise them
    const notifierBuffer = new SharedArrayBuffer(16);
    await postFileWorkerMessage({
        args: [notifierBuffer],
        type: 'setNotifierBuffer',
    });

    // Attaching a mirror of the current filesystem
    // this is because otherwise the two workers would rapidly need to coordinate alot of
    // paths to files. and that would be slow.
    const wasmFs = new WasmFs();
    wasmFs.fromJSON(fsMapping);

    // Overwrite fs functions and redirect them to the FileSystemWorker
    // Object.keys(wasmFs.fs).forEach((key) => {
    //     const originalFunction = wasmFs.fs[key];

    //     if (key === 'openSync') return;

    //     wasmFs.fs[key] = function overwrite(...args: any[]) {
    //         // console.log('[] originalFunction -> ', originalFunction);
    //         console.log('⛔️ Not implemented: ', key, args);
    //         return originalFunction.call(this, ...args);
    //     };
    // });

    const originalOpenSync = wasmFs.fs.openSync;
    wasmFs.fs.openSync = function overwrittenOpenSync(...args) {
        // // TODO: Remove me!
        // if (args[1] === undefined) {
        //     args[1] = 0;
        // }

        if (isDeviceFolder(args[0].toString())) {
            const fd = originalOpenSync(...args);
            return fd;
        }

        const result = callMethodOnFileSystemWorker('openSync', args, notifierBuffer);
        return bufferToNumber(result);
    };

    // @ts-ignore
    wasmFs.fs.statSync = function overwrittenStatSync(...args: any[]) {
        const result = callMethodOnFileSystemWorker('statSync', args, notifierBuffer);
        return createFsStats(JSON.parse(result.toString()));
    };

    const originalFstatSync = wasmFs.fs.fstatSync;
    // @ts-ignore
    wasmFs.fs.fstatSync = function overwritteFStatSync(...args: any[]) {
        if (isDeviceFolder(getPathFromFd(args[0], wasmFs))) {
            // @ts-ignore
            return originalFstatSync(...args);
        }

        const result = callMethodOnFileSystemWorker('fstatSync', args, notifierBuffer);
        return createFsStats(JSON.parse(result.toString()));
    };

    const originalRealPathSync = wasmFs.fs.realpathSync;
    wasmFs.fs.realpathSync = function overwriteRealPathSync(...args: any[]) {
        if (isDeviceFolder(args[0])) {
            // @ts-ignore
            return originalRealPathSync(...args);
        }

        const result = callMethodOnFileSystemWorker('realpathSync', args, notifierBuffer);

        if (!args[1] || (args[1] && args[1].encoding === 'utf8')) {
            return result.toString();
        }

        return result;
    };

    wasmFs.fs.readdirSync = function overwriteReaddirSync(...args: any[]) {
        const result = callMethodOnFileSystemWorker('readdirSync', args, notifierBuffer);

        if (!args[1] || args[1] === 'utf8' || (args[1] && !args[1].encoding) || (args[1] && args[1].encoding === 'utf8')) {
            return JSON.parse(result.toString());
        }

        return result;
    };

    const originalWriteSync = wasmFs.fs.writeSync;
    wasmFs.fs.writeSync = function overwrittenWriteSync(...args: any[]) {
        if (isDeviceFolder(getPathFromFd(args[0], wasmFs))) {
            // @ts-ignore
            return originalWriteSync(...args);
        }

        const result = callMethodOnFileSystemWorker('writeSync', args, notifierBuffer);
        return bufferToNumber(result);
    };

    const originalCloseSync = wasmFs.fs.closeSync;
    wasmFs.fs.closeSync = function overwrittenCloseSync(...args: any[]) {
        if (isDeviceFolder(getPathFromFd(args[0], wasmFs))) {
            // @ts-ignore
            originalCloseSync(...args);
        } else {
            callMethodOnFileSystemWorker('closeSync', args, notifierBuffer);
        }
    };

    wasmFs.fs.mkdirSync = function overwritteMkdirSync(...args: any[]) {
        console.log('[mkdirsync] args -> ', args);
    };

    return wasmFs;
}
