# 📀 PlayOS Kernel for WASI apps.

The kernel for PlayOS is used across platforms for file storing and handling files. But it's not limited to PlayOS. It allows you to run WASI applications and make it interact with your filesystem, cloud, blockchain and more!

## Getting started

```JavaScript
import Kernel, { DesktopProvider } from '@playos/kernel';

// The kernel requires a SEED for identifieng who the user is
const kernel = new Kernel('SEED_HERE', new DesktopProvider());

// Boots the kernel and prepares the filesystem
await kernel.boot();

// Execute a WASM binary with the args cat and test.txt
kernel.vm.execute(WASM_BINARY_HERE, ['cat', '/test.txt']);
```

## Writing a provider

The most powerful part are the providers. It allows you to send files to different places. You don't have to worry about how the VM interacts with your files.
Writing a provider is super simple. You only need to implement the following functions:

```TypeScript
export default interface IKernelProvider {
    // Gives you a set of keys that you could use to authenticate with your applications
    init(keys: string): Promise<void>;

    // Set the current mapping scheme. This is useful if you want to do a clean write on for example a disk
    setMapping(mapping: { [key: string]: any }): Promise<void>;

    // @deprecated A mapping listener. You can set it to a noop.
    setMappingListener(listener: (mapping: { [key: string]: any }) => void): void;

    // Store a key->value pair.
    storageSet(key: string, value: string): Promise<void>;

    // Get a value by it's key (storageSet)
    storageGet(key: string): Promise<string>;

    // Stores a file and returns an id, this could be the path itself or a hash to identify where the file is located
    storeFile(data: Buffer, path?: string): Promise<string>;

    // Fetches the file by using the previously retrieved id.
    fetchFile(id: string): Promise<Buffer>;
}
```

# Who uses the PlayOS Kernel?

- PlayOS Ofcourse!
- Rutile

# Want to contribute?

We are open for contributions, just sent in a PR! ❤️
