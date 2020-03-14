/* eslint-disable no-restricted-globals */

interface PostWorkerMessageParams {
    id?: string;
    type: string | null;
    args: any[];
    value?: any;
}

interface PostWorkerMessageParamsWithTarget extends PostWorkerMessageParams {
    target: string;
    fromTarget: string;
}

export default function postWorkerMessage<R>(params: PostWorkerMessageParamsWithTarget, waitForResponse = false): Promise<R> {
    return new Promise((resolve) => {
        let { id } = params;

        if (!id) {
            id = Math.random().toString() + Date.now().toString();
        }

        function onMessage(message: MessageEvent) {
            if (message.data.id !== id) {
                return;
            }

            self.removeEventListener('message', onMessage);
            resolve(message.data.value);
        }

        if (waitForResponse) {
            self.addEventListener('message', onMessage);
        }

        // @ts-ignore
        postMessage({
            id,
            target: params.target,
            fromTarget: params.fromTarget,
            type: params.type,
            args: params.args,
            value: params.value,
        });

        if (!waitForResponse) {
            resolve();
        }
    });
}

export function createTargetedPostMessageInstance(fromTarget: string, toTarget: string) {
    return function postTargetedMessage<R>(params: PostWorkerMessageParams, waitForResponse: boolean = false): Promise<R> {
        return postWorkerMessage({
            ...params,
            fromTarget,
            target: toTarget,
        }, waitForResponse);
    };
}
