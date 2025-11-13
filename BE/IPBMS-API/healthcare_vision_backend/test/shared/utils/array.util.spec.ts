import { chunkArray, flatten } from '../../../src/shared/utils/array.util';

describe('array.util', () => {
  test('chunkArray splits array into chunks', () => {
    const arr = [1, 2, 3, 4, 5];
    const chunks = chunkArray(arr, 2);
    expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('flatten flattens nested arrays', () => {
    const nested = [[1, 2], [3], [], [4, 5]];
    expect(flatten(nested)).toEqual([1, 2, 3, 4, 5]);
  });
});
