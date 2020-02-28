import Kernel, { bootKernel } from './Kernel';
import BrowserProvider from './provider/BrowserProvider';
import RutileProvider from './provider/RutileProvider';
import DesktopProvider from './provider/DesktopProvider';
import SyncProvider from './provider/SyncProvider';
import FileSystem from './core/FileSystem';
// import { ParsedApplicationInfo } from './core/WasmParser';
// import type { IKernelProvider } from './interfaces/IKernelProvider';
// import Application from './models/Application';

// interface ParsedApplicationInfo {
//     manifest: Application;
//     icon: Blob;
//     binary?: Uint8Array;
//     location: string;
// }

export default Kernel;

export {
    BrowserProvider,
    RutileProvider,
    DesktopProvider,
    SyncProvider,
    // ParsedApplicationInfo,
    FileSystem,
    bootKernel,
};
