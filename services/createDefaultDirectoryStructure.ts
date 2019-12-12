import FileSystem from '../core/FileSystem';

/**
 * Creates a default directory structure
 *
 * @export
 * @param {FileSystem} fs
 * @param {string} [username='root']
 */
export default async function createDefaultDirectoryStructure(fs: FileSystem, username: string = 'root') {
    await fs.makeDir('/Applications/');
    await fs.makeDir('/etc/');
    await fs.makeDir(`/home/${username}/`, {
        recursive: true,
    });

    await fs.writeFile('/etc/.keep', '');
    await fs.writeFile(`/home/${username}/.keep`, '');
    await fs.writeFile(`/Applications/.keep`, '');
}
