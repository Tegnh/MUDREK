import { Fragment, type ReactNode } from "react";

/**
 * عارض Markdown مصغّر لمحتوى الأقسام: عناوين، فقرات، قوائم، وخط عريض فقط.
 * لا حاجة لمكتبة كاملة لمحتوى مُولَّد بهذا القدر من البساطة.
 */

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushUl = () => {
    if (ulItems.length) {
      blocks.push({ type: "ul", items: ulItems });
      ulItems = [];
    }
  };
  const flushOl = () => {
    if (olItems.length) {
      blocks.push({ type: "ol", items: olItems });
      olItems = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushUl();
    flushOl();
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushAll();
      continue;
    }
    if (line.startsWith("### ")) {
      flushAll();
      blocks.push({ type: "h3", text: line.slice(4) });
      continue;
    }
    if (line.startsWith("## ")) {
      flushAll();
      blocks.push({ type: "h2", text: line.slice(3) });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      flushOl();
      ulItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph();
      flushUl();
      olItems.push(line.replace(/^\d+[.)]\s+/, ""));
      continue;
    }
    flushUl();
    flushOl();
    paragraph.push(line);
  }
  flushAll();
  return blocks;
}

function renderInline(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-bold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
    ),
  );
}

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-4 text-[15px] leading-[1.85] text-ink">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2 key={i} className="text-[19px] font-bold leading-snug tracking-[-0.01em]">
                {renderInline(b.text, `h2-${i}`)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="text-[16px] font-bold leading-snug">
                {renderInline(b.text, `h3-${i}`)}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1.5 ps-5 marker:text-muted">
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `ul-${i}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="tabular list-decimal space-y-1.5 ps-5 marker:text-muted">
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `ol-${i}-${j}`)}</li>
                ))}
              </ol>
            );
          default:
            return <p key={i}>{renderInline(b.text, `p-${i}`)}</p>;
        }
      })}
    </div>
  );
}

export default Markdown;
