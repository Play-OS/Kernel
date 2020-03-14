import postWorkerMessage from './postWorkerMessage';

/* eslint-disable no-restricted-globals */
export default function attachMethodsToMessages(selfTargetName: string, methods: Function[]) {
    self.addEventListener('message', async (message: MessageEvent) => {
        const methodName = message.data.type;
        const foundMethod = methods.find((method) => (method.name === methodName || method.name === `bound ${methodName}`));

        if (foundMethod) {
            const result = await foundMethod(...message.data.args);

            postWorkerMessage({
                id: message.data.id,
                args: [],
                fromTarget: selfTargetName,
                target: message.data.fromTarget,
                type: null,
                value: result,
            }, false);
        } else if (methodName !== null) {
            console.warn(`Method ${methodName} does not exists but was called`);
        }
    });
}
