// @ts-ignore
import * as randomfill from "randomfill";
import {
    WASIBindings,
    WASIExitError,
    WASIKillError,
} from "@wasmer/wasi/lib/index";
// @ts-ignore
import path from "path-browserify";
import isNodeJs from "./isNodeJs";

function createHrTimePolyfill() {
    let performance: Performance;

    if (isNodeJs()) {
        // @ts-ignore
        const perfHookfs = __non_webpack_require__('perf_hooks');
        performance = perfHookfs.performance;
    } else {
        performance = global.performance;
    }

    const baseNow = Math.floor((Date.now() - performance.now()) * 1e-3);

    return function hrtime(previousTimestamp: any) {
        // initilaize our variables
        let clocktime = performance.now() * 1e-3;
        let seconds = Math.floor(clocktime) + baseNow;
        let nanoseconds = Math.floor((clocktime % 1) * 1e9);

        // Compare to the prvious timestamp if we have one
        if (previousTimestamp) {
            seconds = seconds - previousTimestamp[0];
            nanoseconds = nanoseconds - previousTimestamp[1];
            if (nanoseconds < 0) {
                seconds--;
                nanoseconds += 1e9;
            }
        }
        // Return our seconds tuple
        return [seconds, nanoseconds];
    };
}

const hrtime = createHrTimePolyfill();
const NS_PER_SEC: number = 1e9;

const getBigIntHrtime = (nativeHrtime: Function) => {
    return (time?: [number, number]) => {
        const diff = nativeHrtime(time);
        // Return the time
        return (diff[0] * NS_PER_SEC + diff[1]) as unknown;
    };
};



export default function createWasiBindings(): WASIBindings {
    if (isNodeJs()) {
        // @ts-ignore
        const crypto = __non_webpack_require__('crypto');

        return {
            // @ts-ignore
            hrtime: getBigIntHrtime(hrtime),
            exit: (code: number | null) => {
                throw new WASIExitError(code);
            },
            kill: (signal: string) => {
                throw new WASIKillError(signal);
            },
            // @ts-ignore
            randomFillSync: crypto.randomFillSync,
            isTTY: () => true,
            path: path,

            // Let the user attach the fs at runtime
            fs: null,
        };
    } else {
        return {
            // @ts-ignore
            hrtime: getBigIntHrtime(hrtime),
            exit: (code: number | null) => {
                throw new WASIExitError(code);
            },
            kill: (signal: string) => {
                throw new WASIKillError(signal);
            },
            // @ts-ignore
            randomFillSync: randomfill.randomFillSync,
            isTTY: () => true,
            path: path,

            // Let the user attach the fs at runtime
            fs: null,
        };
    }
};
