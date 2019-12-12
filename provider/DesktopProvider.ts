import IKernelProvider from '../interfaces/IKernelProvider';
import stringToBytes from '../services/stringToBytes';
// import fs from 'fs';

const MAIN_DIR = 'PlayOS';

class DesktopProvider implements IKernelProvider {
    mapping: {[key: string]: object};
    homeDir: string;
    mapListener: (mapping: {[key: string]: any}) => void = () => {};

    constructor() {
        const os = __non_webpack_require__('os');
        this.homeDir = `${os.homedir()}/${MAIN_DIR}/`;
    }

    /**
     * Creates all directories needed for writing a file
     *
     * @private
     * @param {string} path
     * @memberof DesktopProvider
     */
    private createDirectoriesForPath(path: string) {
        const fs = __non_webpack_require__('fs');

        const splittedPath = path.split('/').filter(p => p);
        const file = splittedPath.pop();
        const folderPath = splittedPath.join('/');

        if (!fs.existsSync(`${this.homeDir}${folderPath}`)) {
            // Keep track of wich folder we are currently checking
            let pathPart = '';

            // We are going over every single folder in the path
            // and make sure the folder exists otherwise create it.
            splittedPath.forEach((splittedPathPart) => {
                pathPart += splittedPathPart + '/';

                if (!fs.existsSync(`${this.homeDir}${pathPart}`)) {
                    fs.mkdirSync(`${this.homeDir}${pathPart}`, {
                        recursive: true,
                    });
                }
            });
        }
    }

    async init(key: string) {
        const fs = __non_webpack_require__('fs');

        if (!fs.existsSync(this.homeDir)) {
            fs.mkdirSync(this.homeDir);
        }

        fs.watch(this.homeDir, {
            recursive: true,
        }, (event: string, fileName: string) => {
            // A file has b een changed and we need to reflect this in our fs_map
            console.log('[] event, fileName -> ', event, fileName);
        });
    }

    async setMapping(mapping: {[key: string]: any}) {
        const fs = __non_webpack_require__('fs');

        this.mapping = mapping;

        Object.keys(mapping).forEach((path) => {
            // We are not sure if the folder exist already
            const splittedPath = path.split('/').filter(p => p);
            const file = splittedPath.pop();
            const folderPath = splittedPath.join('/');

            if (!fs.existsSync(`${this.homeDir}${folderPath}`)) {
                // Keep track of wich folder we are currently checking
                let pathPart = '';

                // We are going over every single folder in the path
                // and make sure the folder exists otherwise create it.
                splittedPath.forEach((splittedPathPart) => {
                    pathPart += splittedPathPart + '/';

                    if (!fs.existsSync(`${this.homeDir}${pathPart}`)) {
                        fs.mkdirSync(`${this.homeDir}${pathPart}`, {
                            recursive: true,
                        });
                    }
                });
            }

            fs.writeFileSync(`${this.homeDir}${path}`, Buffer.from(mapping[path]));
        });

        // We normally should do a div and fill the mapping
        console.log('[] this.mapping -> ', this.mapping);
    }

    setMappingListener(listener: (mapping: { [key: string]: string }) => void) {
        this.mapListener = listener;
    }

    async storageGet(key: string) {
        return (await this.fetchFile(`etc/${key}`)).toString();
    }

    async storageSet(key: string, value: any): Promise<void> {
        await this.storeFile(value, `etc/${key}`);
    }

    async fetchFile(id: string): Promise<Buffer> {
        const fs = __non_webpack_require__('fs');

        try {
            return fs.readFileSync(`${this.homeDir}${id}`);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async storeFile(file: Buffer, path?: string): Promise<string> {
        const fs = __non_webpack_require__('fs');

        this.mapping[path] = Buffer.from(stringToBytes(path)).toJSON();
        this.mapListener(this.mapping);

        this.createDirectoriesForPath(path);
        fs.writeFileSync(`${this.homeDir}${path}`, file);

        return path;
    }
}

export default DesktopProvider;
