import Stats from 'memfs/lib/Stats';

/**
 * Creates a fs.Stats compatible class
 *
 * @export
 * @param {...any[]} args Arguments that where JSON
 * @returns
 */
export default function createFsStats(statsRaw: any) {
    const stats = new Stats();

    if (statsRaw) {
        Object.keys(statsRaw).forEach((key) => {
            stats[key] = statsRaw[key];
        });
    } else {
        console.error(statsRaw, stats);
    }

    return stats;
}
