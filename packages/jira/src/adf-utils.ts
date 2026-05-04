/**
 * Extracts plain text from Atlassian Document Format (ADF) JSON.
 * Recursively walks the ADF tree, concatenating text nodes
 * and inserting newlines after block-level elements.
 */

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'listItem',
  'blockquote',
  'codeBlock',
  'mediaGroup',
  'decisionItem',
  'taskItem',
  'tableCell',
  'tableHeader',
  'rule',
]);

export function extractTextFromAdf(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';

  let text = '';

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      text += extractTextFromAdf(child);
    }
  }

  if (BLOCK_TYPES.has(node.type)) {
    text += '\n';
  }

  return text;
}
