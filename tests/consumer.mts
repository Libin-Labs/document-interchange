import {
  createDocument,
  exportPlainText,
  parseDocumentJson,
  type InterchangeResult,
} from '@lp-labs/document-interchange';

const document = createDocument([{ type: 'paragraph', text: 'Hello' }]);
const output: InterchangeResult<string> = exportPlainText(document);
const parsed = parseDocumentJson(
  JSON.stringify({ version: 1, blocks: [{ type: 'paragraph', text: 'Hi' }] }),
);
console.log(output.value, parsed.value.blocks.length);
