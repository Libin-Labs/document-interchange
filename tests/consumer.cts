import api = require('@lp-labs/document-interchange');

const result = api.importPlainText('one\ntwo');
console.log(result.value.blocks.length, result.losses.length);
