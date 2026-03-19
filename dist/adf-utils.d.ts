/**
 * Extracts plain text from Atlassian Document Format (ADF) JSON.
 * Recursively walks the ADF tree, concatenating text nodes
 * and inserting newlines after block-level elements.
 */
export declare function extractTextFromAdf(node: any): string;
