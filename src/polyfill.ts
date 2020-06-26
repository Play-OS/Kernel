import isNodeJs from "./services/isNodeJs";

declare var __non_webpack_require__: any;

if (isNodeJs()) {
    const { performance } = __non_webpack_require__('perf_hooks');

    global.performance = performance;
}
