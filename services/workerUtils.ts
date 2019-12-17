export interface RequestMessage {
    type: string,
    value: any,
    id?: string,
    bufferIndex?: number;
}

export function workerPostMessage(message: RequestMessage) {
    // @ts-ignore
    self.postMessage(message);
}

export function workerRequest(message: RequestMessage, listenForChanges: boolean = true): Promise<RequestMessage> {
    return new Promise((resolve) => {
        message.id = Math.random().toString();

        if (listenForChanges) {
            function listener(event: any) {
                const receivedMessage = extractMessageFromEvent(event);

                if (receivedMessage.id === message.id) {
                    workerRemoveEventListener('message', listener);
                    resolve(receivedMessage);
                }
            }

            workerPostMessage(message);
            workerAddEventListener('message', listener);
        } else {
            workerPostMessage(message);
            resolve(null);
        }
    });
}

export function workerRemoveEventListener(eventType: string, callback: (event: any) => void) {
    self.removeEventListener(eventType, callback);
}

export function workerAddEventListener(eventType: string, callback: (event: any) => void) {
    self.addEventListener(eventType, callback);
}

export function addEventListenerOnWorker(worker: Worker, evenType: string, callback: (event: any) => void) {
    worker.addEventListener(evenType, callback);
}

export function postMessageOnWorker(worker: Worker, message: RequestMessage) {
    worker.postMessage(message);
}

export function extractMessageFromEvent(event: any): RequestMessage {
    return event.data;
}
