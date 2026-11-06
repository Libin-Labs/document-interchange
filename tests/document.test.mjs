import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  createDocument,
  exportPlainText,
  importPlainText,
  parseDocumentJson,
  serializeDocumentJson,
} from '../dist/esm/index.js';

test('canonical JSON round-trips blocks without loss', () => {
  const doc = createDocument([
    { type: 'heading', level: 2, text: 'Heading' },
    { type: 'paragraph', text: 'Body' },
    { type: 'list-item', text: 'Entry' },
  ]);
  const encoded = serializeDocumentJson(doc);
  assert.deepEqual(encoded.losses, []);
  assert.deepEqual(parseDocumentJson(encoded.value).value, doc);
  assert.throws(() => serializeDocumentJson({ version: 2, blocks: [] }), /version-1/);
});

test('plain text imports lines as paragraphs and normalizes line endings', () => {
  const imported = importPlainText('one\r\ntwo\rthree');
  assert.deepEqual(imported.losses, []);
  assert.deepEqual(imported.value.blocks, [
    { type: 'paragraph', text: 'one' },
    { type: 'paragraph', text: 'two' },
    { type: 'paragraph', text: 'three' },
  ]);
});

test('empty input and trailing newline remain representable as empty paragraphs', () => {
  assert.deepEqual(importPlainText('').value.blocks, [{ type: 'paragraph', text: '' }]);
  assert.equal(exportPlainText(importPlainText('a\n').value).value, 'a\n');
});

test('plain-text export reports discarded block semantics', () => {
  const result = exportPlainText(
    createDocument([
      { type: 'heading', level: 3, text: 'Title' },
      { type: 'list-item', text: 'Entry' },
    ]),
  );
  assert.equal(result.value, 'Title\nEntry');
  assert.deepEqual(result.losses, [
    'Block types and heading levels are not represented in plain text.',
  ]);
});

test('malformed JSON, wrong versions, and noncanonical properties reject', () => {
  assert.throws(() => parseDocumentJson('{'), /malformed/);
  assert.throws(() => parseDocumentJson({ version: 2, blocks: [] }), /version 1/);
  assert.throws(() => parseDocumentJson({ version: 1, blocks: [], hidden: true }), /unsupported/);
  assert.throws(
    () =>
      parseDocumentJson({
        version: 1,
        blocks: [{ type: 'paragraph', text: 'x', html: '<b>' }],
      }),
    /unsupported/,
  );
});

test('invalid blocks and heading levels reject clearly', () => {
  assert.throws(() => createDocument([{ type: 'image', text: 'x' }]), /Block type/);
  assert.throws(() => createDocument([{ type: 'paragraph', text: 5 }]), /Block text/);
  assert.throws(() => createDocument([{ type: 'heading', level: 7, text: 'x' }]), /Heading level/);
  assert.throws(
    () => createDocument([{ type: 'paragraph', level: 1, text: 'x' }]),
    /Only headings/,
  );
});

test('document block and text limits are bounded', () => {
  assert.throws(
    () => createDocument([{ type: 'paragraph', text: 'a' }], { maxBlocks: 0 }),
    /maxBlocks/,
  );
  assert.throws(
    () =>
      createDocument(
        [
          { type: 'paragraph', text: 'a' },
          { type: 'paragraph', text: 'b' },
        ],
        { maxBlocks: 1 },
      ),
    /Block capacity/,
  );
  assert.throws(
    () =>
      createDocument([{ type: 'paragraph', text: 'abc' }], {
        maxTextLength: 2,
      }),
    /text capacity/,
  );
  assert.throws(() => importPlainText('abc', { maxTextLength: 2 }), /capacity/);
  assert.throws(
    () => parseDocumentJson('{"version":1,"blocks":[]}', { maxJsonLength: 5 }),
    /JSON capacity/,
  );
});

test('generated documents preserve exact newline-separated content', () => {
  const lines = Array.from({ length: 500 }, (_, index) => `paragraph-${index}`);
  const imported = importPlainText(lines.join('\n'));
  assert.equal(exportPlainText(imported.value).value, lines.join('\n'));
  assert.equal(imported.value.blocks.length, lines.length);
});

test('CommonJS exports the same plain-text adapter', () => {
  const api = createRequire(import.meta.url)('../dist/cjs/index.js');
  assert.equal(api.importPlainText('ok').value.blocks[0].text, 'ok');
});
