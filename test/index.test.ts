// @ts-ignore
import * as PlayOS from '../build/kernel';
import { TestProvider, fileStorage, keyStorage } from './TestProvider';


describe('index', () => {
    it('should be able to boot', async () => {
        // @ts-ignore
        await PlayOS.bootKernel('TEST_SEED', TestProvider);
    });
});
