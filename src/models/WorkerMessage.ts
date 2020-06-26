export enum MessageType {
    Event = 'EVENT',
    Spawn = 'SPAWN',
    Provider = 'PROVIDER',
    Message = 'MESSAGE',
    Exit = 'EXIT',
}

export interface RequestMessage<T> {
    type: MessageType,
    value: T,
    method?: string,
    id?: string,
}
