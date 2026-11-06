# @lp-labs/document-interchange

A canonical JSON-safe block model with plain JSON and plain-text adapters. Conversion reports
losses explicitly; this package does not pretend to import or export PDF, DOCX, HTML, or rich text.

## Install

```sh
npm install @lp-labs/document-interchange
```

```js
import {
  createDocument,
  exportPlainText,
  importPlainText,
  serializeDocumentJson,
} from '@lp-labs/document-interchange';

const document = createDocument([
  { type: 'heading', level: 1, text: 'Notes' },
  { type: 'paragraph', text: 'Canonical content.' },
]);
const json = serializeDocumentJson(document);
const plain = exportPlainText(document);
console.log(json.losses); // []
console.log(plain.value, plain.losses); // "Notes\nCanonical content.", [explicit formatting loss]
console.log(importPlainText('First line\nSecond line').value.blocks);
```

## API

- `createDocument(blocks, limits?)` validates and copies a canonical version-1 document.
- `parseDocumentJson(input, limits?)` accepts JSON text or an already-parsed value and returns
  `{ value, losses }`. Canonical input must contain only `version: 1` and `blocks`.
- `serializeDocumentJson(document)` returns canonical JSON and an empty loss list.
- `importPlainText(text, limits?)` normalizes CRLF/CR to LF and maps each line to a paragraph.
  Empty lines, including a final empty line, remain paragraphs.
- `exportPlainText(document)` joins block text with LF. It reports a loss if heading/list-item kinds
  or heading levels are discarded.
- `BlockType`, `DocumentBlock`, `CanonicalDocument`, `InterchangeResult`, and `DocumentLimits` are
  exported types.

Blocks are paragraphs (`{ type: 'paragraph', text }`), headings (optional levels 1–6), or list
items. Content is plain text; inline formatting, embedded objects, page layout, metadata,
attachments, and nested lists are outside this model.

The defaults cap documents at 100,000 blocks, 1,000,000 combined text characters, and 16,000,000
JSON input characters. `maxBlocks`, `maxTextLength`, and `maxJsonLength` can lower those limits.
Invalid JSON, unsupported fields, unknown versions, invalid blocks, and exceeded limits fail with
`SyntaxError`, `TypeError`, or `RangeError`; no partially parsed document is returned.

## Module formats and customization

ESM, CommonJS, and TypeScript declarations are provided. CommonJS:
`const { importPlainText } = require('@lp-labs/document-interchange')`. Applications can map their
own document format into the canonical block types, then inspect `losses` before accepting a text
export. PDF and DOCX require dedicated format-specific libraries and are intentionally not faked.

There are no runtime or peer dependencies. TypeScript and Prettier are development-only.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
