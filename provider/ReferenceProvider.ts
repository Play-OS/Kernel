/* eslint-disable class-methods-use-this */
import IKernelProvider from "../interfaces/IKernelProvider";
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { createUploadLink } from 'apollo-upload-client';
// import { HttpLink } from "apollo-link-http";
// import { onError } from "apollo-link-error";
// import { ApolloLink } from "apollo-link";
import gql from 'graphql-tag';
import stringToBytes from "../services/stringToBytes";

class ReferenceProvider implements IKernelProvider {
    private privateKey: string = '';
    private publicKey: string = '0xDEADBEEF';
    private client: ApolloClient<any>;

    constructor() {
        this.client = new ApolloClient({
            link: createUploadLink({ uri: 'http://localhost:4000/graphql' }),
            cache: new InMemoryCache()
        });
    }

    async init(privateKey: string) {
        this.privateKey = privateKey;
        this.publicKey = privateKey;
    }

    async setMapping(mapping: { [key: string]: object }) {}

    setMappingListener(listener: any) {}

    async storageGet(key: string): Promise<string | null> {
        const file = await this.fetchFile(`/etc/${key}`);

        if (file) {
            const result = file.toString();
            return result;
        }

        return null;
    }

    async storageSet(key: string, value: string) {
        await this.storeFile(Buffer.from(stringToBytes(value)), `/etc/${key}`);
    }

    async fetchFile(path: string) {
        const response = await this.client.query({
            query: gql`
                query FetchFile($path: String!, $signedMessage: String!) {
                    file(path: $path, signedMessage: $signedMessage) {
                        path
                        fileLocation
                    }
                }
            `,
            variables: {
                path,
                signedMessage: this.publicKey,
            }
        });

        if (!response.data.file) {
            return null;
        }

        const fileResponse = await fetch(response.data.file.fileLocation);
        const fileArrayBuffer = await fileResponse.arrayBuffer();

        return Buffer.from(fileArrayBuffer);
    }

    async storeFile(file: Buffer, path: string) {
        const fileInstance = new File([file], `encryptedfile/${path}`);
        await this.client.mutate({
            mutation: gql`
                mutation UploadFile($file: Upload!, $path: String!, $signedMessage: String!) {
                    uploadFile(file: $file, path: $path, signedMessage: $signedMessage) {
                        path
                        fileLocation,
                    }
                }
            `,
            variables: {
                file: fileInstance,
                path,
                signedMessage: this.publicKey,
            }
        });

        return path;
    }
}

export default ReferenceProvider;
