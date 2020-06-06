import FileSystem from '../core/FileSystem';

/**
 * Creates a default directory structure
 *
 * @export
 * @param {FileSystem} fs
 * @param {string} [username='root']
 */
export default async function createDefaultDirectoryStructure(fs: FileSystem, username: string = 'root') {
    console.log('Creating folder structure..');
    await fs.makeDir('/Applications/');
    await fs.makeDir('/etc/');
    await fs.makeDir(`/home/${username}/`, {
        recursive: true,
    });

    await fs.makeDir('/bin/');

    await fs.writeFile('/etc/.keep', '');
    await fs.writeFile(`/home/${username}/.keep`, '');
    await fs.writeFile(`/Applications/.keep`, '');

    // These are virtual files
    await fs.makeDir('/_wasmer/dev/fb0/', {
        recursive: true,
    });

    await fs.writeFile(`/_wasmer/dev/fb0/draw`, '');
    await fs.writeFile(`/_wasmer/dev/fb0/fb`, '');
    await fs.writeFile(`/_wasmer/dev/fb0/input`, '');
    await fs.writeFile(`/_wasmer/dev/fb0/virtual_size`, '');
}
