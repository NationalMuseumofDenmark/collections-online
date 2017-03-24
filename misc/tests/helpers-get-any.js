const assert = require('assert');
const helpers = require('../../lib/helpers');

// Example #1
const object1 = {
  a: [
    {
      b: [{c: 'test'}, {c: 'this'}]
    }
  ]
};
const path1 = 'a.b.c';

assert.deepStrictEqual(helpers.getAny(object1, path1), [['test', 'this']]);

const object2 = {
  a: [
    {
      b: [false, 0]
    },
    {
      b: [null, undefined]
    }
  ]
};
const path2 = 'a.b';

assert.deepStrictEqual(helpers.getAny(object2, path2), [
  [false, 0], [null, undefined]
]);

assert.deepStrictEqual(helpers.getAnyFlat(object2, [path2]), [
  false, 0, null, undefined
]);
