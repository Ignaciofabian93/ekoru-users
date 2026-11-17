import { registerEnumType } from '@nestjs/graphql';

/**
 * How a terms text is written and shown (LEG-1).
 *
 * The panel stores each version as Markdown-lite so a person can edit it in a
 * plain text box: "## " starts a clause title, "### " a sub-clause title,
 * "- " a list item, and a blank line ends a paragraph. Nothing else is markup
 * and nothing is HTML, so the web, the app and the landing site render the
 * same blocks as plain text and no stored text can inject a script.
 */
export enum TermsBlockKind {
  HEADING = 'HEADING',
  SUBHEADING = 'SUBHEADING',
  PARAGRAPH = 'PARAGRAPH',
  LIST_ITEM = 'LIST_ITEM',
}

registerEnumType(TermsBlockKind, {
  name: 'TermsBlockKind',
  description:
    'A piece of a terms text: clause title, sub-clause title, paragraph or list item.',
});

export interface TermsBlockData {
  kind: TermsBlockKind;
  text: string;
}

/** Longest text a version may hold per language (the current one is ~15k). */
export const TERMS_CONTENT_MAX = 100_000;

export function parseTermsContent(content: string): TermsBlockData[] {
  const blocks: TermsBlockData[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({
        kind: TermsBlockKind.PARAGRAPH,
        text: paragraph.join(' '),
      });
      paragraph = [];
    }
  };
  const push = (kind: TermsBlockKind, text: string) => {
    flush();
    if (text) blocks.push({ kind, text });
  };

  for (const raw of content.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) flush();
    else if (line.startsWith('### '))
      push(TermsBlockKind.SUBHEADING, line.slice(4).trim());
    else if (line.startsWith('## '))
      push(TermsBlockKind.HEADING, line.slice(3).trim());
    else if (line.startsWith('# '))
      push(TermsBlockKind.HEADING, line.slice(2).trim());
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      push(TermsBlockKind.LIST_ITEM, line.slice(2).trim());
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}

/** A text the panel can save: not empty, not too long, with at least one clause title. */
export function isUsableTermsContent(content: string): boolean {
  if (!content.trim() || content.length > TERMS_CONTENT_MAX) return false;
  return parseTermsContent(content).some(
    (b) => b.kind === TermsBlockKind.HEADING,
  );
}
