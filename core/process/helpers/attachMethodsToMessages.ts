import postWorkerMessage from './postWorkerMessage';

interface Methods {
    name: string;
    func: Function;
}

/* eslint-disable no-restricted-globals */
export default function attachMethodsToMessages(selfTargetName: string, methods: Methods[]) {
    self.addEventListener('message', async (message: MessageEvent) => {
        const methodName: string = message.data.type;
        const foundMethod = methods.find((method) => (method.name === methodName));

        if (foundMethod) {
            const result = await foundMethod.func(...message.data.args);

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
