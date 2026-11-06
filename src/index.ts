export type BlockType = 'paragraph' | 'heading' | 'list-item';

export interface DocumentBlock {
  type: BlockType;
  text: string;
  level?: number;
}

export interface CanonicalDocument {
  version: 1;
  blocks: readonly DocumentBlock[];
}

export interface InterchangeResult<T> {
  value: T;
  losses: string[];
}

export interface DocumentLimits {
  maxBlocks?: number;
  maxTextLength?: number;
  maxJsonLength?: number;
}

const MAX_BLOCKS = 100_000;
const MAX_TEXT_LENGTH = 1_000_000;
const MAX_JSON_LENGTH = 16_000_000;

function positiveLimit(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 1 || result > fallback) {
    throw new RangeError(`${name} must be an integer from 1 to ${fallback}.`);
  }
  return result;
}

function normalizeBlock(value: unknown): DocumentBlock {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Each block must be an object.');
  }
  const block = value as Record<string, unknown>;
  if (block.type !== 'paragraph' && block.type !== 'heading' && block.type !== 'list-item') {
    throw new TypeError('Block type must be paragraph, heading, or list-item.');
  }
  if (typeof block.text !== 'string' || block.text.length > MAX_TEXT_LENGTH) {
    throw new TypeError(`Block text must be a string up to ${MAX_TEXT_LENGTH} characters.`);
  }
  if (block.type !== 'heading' && block.level !== undefined) {
    throw new TypeError('Only headings may have a level.');
  }
  const allowed = block.type === 'heading' ? ['type', 'text', 'level'] : ['type', 'text'];
  if (Object.keys(block).some((key) => !allowed.includes(key))) {
    throw new TypeError('Block contains unsupported properties.');
  }
  if (block.type === 'heading') {
    const level = block.level ?? 1;
    if (!Number.isSafeInteger(level) || (level as number) < 1 || (level as number) > 6) {
      throw new RangeError('Heading level must be an integer from 1 to 6.');
    }
    return Object.freeze({
      type: 'heading',
      text: block.text,
      level: level as number,
    });
  }
  if (block.level !== undefined) throw new TypeError('Only headings may have a level.');
  return Object.freeze({ type: block.type, text: block.text });
}

export function createDocument(
  blocks: Iterable<DocumentBlock>,
  limits: DocumentLimits = {},
): CanonicalDocument {
  if (blocks == null || typeof blocks[Symbol.iterator] !== 'function') {
    throw new TypeError('Blocks must be iterable.');
  }
  const maxBlocks = positiveLimit(limits.maxBlocks, MAX_BLOCKS, 'maxBlocks');
  const maxTextLength = positiveLimit(limits.maxTextLength, MAX_TEXT_LENGTH, 'maxTextLength');
  const copied: DocumentBlock[] = [];
  let textLength = 0;
  for (const block of blocks) {
    if (copied.length >= maxBlocks) throw new RangeError('Block capacity exceeded.');
    const normalized = normalizeBlock(block);
    textLength += normalized.text.length;
    if (textLength > maxTextLength) throw new RangeError('Document text capacity exceeded.');
    copied.push(normalized);
  }
  return Object.freeze({ version: 1, blocks: Object.freeze(copied) });
}

export function parseDocumentJson(
  input: string | unknown,
  limits: DocumentLimits = {},
): InterchangeResult<CanonicalDocument> {
  let value: unknown;
  if (typeof input === 'string') {
    const maxJsonLength = positiveLimit(limits.maxJsonLength, MAX_JSON_LENGTH, 'maxJsonLength');
    if (input.length > maxJsonLength) throw new RangeError('Document JSON capacity exceeded.');
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      throw new SyntaxError('Document JSON is malformed.');
    }
  } else {
    value = input;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Document JSON must contain an object.');
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.blocks)) {
    throw new TypeError('Document JSON must have version 1 and a blocks array.');
  }
  if (Object.keys(record).some((key) => key !== 'version' && key !== 'blocks')) {
    throw new TypeError('Document JSON contains unsupported properties.');
  }
  return {
    value: createDocument(record.blocks as DocumentBlock[], limits),
    losses: [],
  };
}

export function serializeDocumentJson(document: CanonicalDocument): InterchangeResult<string> {
  if (!document || document.version !== 1 || !Array.isArray(document.blocks)) {
    throw new TypeError('Expected a version-1 canonical document.');
  }
  const canonical = createDocument(document.blocks);
  const value = JSON.stringify(canonical);
  if (value.length > MAX_JSON_LENGTH) throw new RangeError('Document JSON capacity exceeded.');
  return { value, losses: [] };
}

export function importPlainText(
  text: string,
  limits: DocumentLimits = {},
): InterchangeResult<CanonicalDocument> {
  if (typeof text !== 'string') throw new TypeError('Plain text input must be a string.');
  if (text.length > (limits.maxTextLength ?? MAX_TEXT_LENGTH)) {
    throw new RangeError('Plain text capacity exceeded.');
  }
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  return {
    value: createDocument(
      lines.map((line) => ({ type: 'paragraph', text: line })),
      limits,
    ),
    losses: [],
  };
}

export function exportPlainText(document: CanonicalDocument): InterchangeResult<string> {
  const canonical = createDocument(document.blocks);
  const losses = canonical.blocks.some((block) => block.type !== 'paragraph')
    ? ['Block types and heading levels are not represented in plain text.']
    : [];
  return {
    value: canonical.blocks.map((block) => block.text).join('\n'),
    losses,
  };
}
