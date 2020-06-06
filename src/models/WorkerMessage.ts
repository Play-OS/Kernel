export default interface WorkerMessage {
    type: string;
    target: string;
    value: any;
}
