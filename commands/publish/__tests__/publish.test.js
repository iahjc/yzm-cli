'use strict';

const publish = require('../lib');
const assert = require('assert').strict;

assert.strictEqual(publish(), 'Hello from publish');
console.info("publish tests passed");
