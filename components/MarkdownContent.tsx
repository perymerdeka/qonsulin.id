import type { ReactNode } from "react";

type MarkdownContentProps = {
  content: string;
};

type TableBlock = {
  headers: string[];
  rows: string[][];
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return <div className="article-body prose prose-qonsulin">{parseBlocks(content)}</div>;
}

function parseBlocks(content: string) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 4);
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      blocks.push(<Tag key={`heading-${index}`}>{parseInline(heading[2], `heading-${index}`)}</Tag>);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const { table, nextIndex } = readTable(lines, index);
      blocks.push(renderTable(table, `table-${index}`));
      index = nextIndex;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}><p>{parseInline(quoteLines.join(" "), `quote-${index}`)}</p></blockquote>);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const list = readLooseList(lines, index, /^[-*]\s+(.+)$/);
      index = list.index;
      blocks.push(<ul key={`ul-${index}`}>{list.items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`}>{parseInline(item, `ul-${index}-${itemIndex}`)}</li>)}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const start = Number(trimmed.match(/^(\d+)\.\s+/)?.[1] || 1);
      const list = readLooseList(lines, index, /^\d+\.\s+(.+)$/, true);
      index = list.index;
      blocks.push(<ol key={`ol-${index}`} start={start}>{list.items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`}>{parseInline(item, `ol-${index}-${itemIndex}`)}</li>)}</ol>);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`p-${index}`}>{parseInline(paragraph.join(" "), `p-${index}`)}</p>);
  }

  return blocks;
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const patterns = [
    { type: "code", regex: /`([^`]+)`/ },
    { type: "link", regex: /\[([^\]]+)\]\(([^)\s]+)\)/ },
    { type: "strong", regex: /\*\*([^*]+)\*\*/ },
    { type: "em", regex: /_([^_]+)_/ }
  ] as const;

  const nodes: ReactNode[] = [];
  let rest = text;
  let count = 0;

  while (rest) {
    const matches = patterns
      .map((pattern) => ({ pattern, match: pattern.regex.exec(rest) }))
      .filter((entry): entry is { pattern: (typeof patterns)[number]; match: RegExpExecArray } => Boolean(entry.match))
      .sort((a, b) => a.match.index - b.match.index);

    const next = matches[0];
    if (!next) {
      nodes.push(rest);
      break;
    }

    if (next.match.index > 0) nodes.push(rest.slice(0, next.match.index));

    const key = `${keyPrefix}-inline-${count}`;
    if (next.pattern.type === "code") {
      nodes.push(<code key={key}>{next.match[1]}</code>);
    } else if (next.pattern.type === "link") {
      nodes.push(<a key={key} href={next.match[2]} target={next.match[2].startsWith("http") ? "_blank" : undefined} rel={next.match[2].startsWith("http") ? "noreferrer" : undefined}>{parseInline(next.match[1], key)}</a>);
    } else if (next.pattern.type === "strong") {
      nodes.push(<strong key={key}>{parseInline(next.match[1], key)}</strong>);
    } else {
      nodes.push(<em key={key}>{parseInline(next.match[1], key)}</em>);
    }

    rest = rest.slice(next.match.index + next.match[0].length);
    count += 1;
  }

  return nodes;
}

function isBlockStart(lines: string[], index: number) {
  const trimmed = lines[index].trim();
  return /^(#{1,4})\s+/.test(trimmed) || /^>\s?/.test(trimmed) || /^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed) || isTableStart(lines, index);
}

function isTableStart(lines: string[], index: number) {
  return Boolean(lines[index]?.includes("|") && /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(lines[index + 1] || ""));
}

function readLooseList(lines: string[], startIndex: number, itemPattern: RegExp, allowContinuations = false) {
  const items: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const match = itemPattern.exec(lines[index].trim());
    if (!match) break;

    const itemParts = [match[1]];
    index += 1;

    while (index < lines.length) {
      const current = lines[index].trim();
      if (!current) {
        index += 1;
        continue;
      }

      if (itemPattern.test(current)) break;
      if (!allowContinuations) break;
      if (/^(#{1,4})\s+/.test(current) || /^>\s?/.test(current) || isTableStart(lines, index)) break;

      itemParts.push(current);
      index += 1;
    }

    items.push(itemParts.join(" "));

    if (index >= lines.length || !itemPattern.test(lines[index].trim())) break;
  }

  return { items, index };
}

function readTable(lines: string[], index: number): { table: TableBlock; nextIndex: number } {
  const headers = splitTableRow(lines[index]);
  const rows: string[][] = [];
  let nextIndex = index + 2;

  while (nextIndex < lines.length && lines[nextIndex].includes("|") && lines[nextIndex].trim()) {
    rows.push(splitTableRow(lines[nextIndex]));
    nextIndex += 1;
  }

  return { table: { headers, rows }, nextIndex };
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(table: TableBlock, key: string) {
  return (
    <div className="prose-table-wrap" key={key}>
      <table>
        <thead><tr>{table.headers.map((header, index) => <th key={`${key}-h-${index}`}>{parseInline(header, `${key}-h-${index}`)}</th>)}</tr></thead>
        <tbody>{table.rows.map((row, rowIndex) => <tr key={`${key}-r-${rowIndex}`}>{table.headers.map((_, cellIndex) => <td key={`${key}-r-${rowIndex}-${cellIndex}`}>{parseInline(row[cellIndex] || "", `${key}-r-${rowIndex}-${cellIndex}`)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
