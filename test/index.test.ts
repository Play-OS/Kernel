// @ts-ignore
import * as PlayOS from '../build/kernel';
import { TestProvider, fileStorage, keyStorage } from './TestProvider';


describe('index', () => {
    it('should be able to boot', async (done) => {
        const kernel = await PlayOS.bootKernel('TEST_SEED', TestProvider);

        expect(kernel).toBeDefined();
        done();
    });
});
