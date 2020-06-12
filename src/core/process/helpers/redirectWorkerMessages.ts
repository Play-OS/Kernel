import { addEventListenerOnWorker } from "../../../services/workerUtils";

interface WorkerWithTarget {
    worker: Worker;
    targetName: string;
}

/**
 * Redirect a worker message to a different target
 *
 * @export
 * @param {WorkerWithTarget[]} workers
 */
export default function redirectWorkerMessages(workers: WorkerWithTarget[]) {
    function onMessage(message: MessageEvent) {
        const { target } = message.data;

        if (!target) {
            return;
        }

        const workerWithTarget = workers.find((worker) => worker.targetName === target);

        if (!workerWithTarget) {
            console.warn(`[redirectWorkerMessages] Could not redirect to ${target} because it does not exist`);
            return;
        }

        workerWithTarget.worker.postMessage(message.data);
    }

    workers.forEach((workerWithTarget) => {
        addEventListenerOnWorker(workerWithTarget.worker, 'message', onMessage);
    });
}
