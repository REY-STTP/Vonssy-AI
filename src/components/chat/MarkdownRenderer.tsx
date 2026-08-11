"use client";

import React, { useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useLocale } from "@/hooks/useLocale";

/**
 * Custom dark theme matching the Vonssy palette.
 * Based on the Void/Ink/Bone/Ember/Wraith tokens.
 */
const vonssyTheme: Record<string, React.CSSProperties> = {
  'pre[class*="language-"]': {
    background: "#0A0910",
    color: "#EDE8DC",
    padding: "1rem",
    margin: 0,
    overflow: "auto",
    fontFamily: "var(--font-jetbrains), monospace",
    fontSize: "0.85rem",
    lineHeight: 1.6,
  },
  'code[class*="language-"]': {
    background: "none",
    color: "#EDE8DC",
    fontFamily: "var(--font-jetbrains), monospace",
    fontSize: "0.85rem",
  },
  comment: { color: "#4A4458" },
  prolog: { color: "#4A4458" },
  doctype: { color: "#4A4458" },
  cdata: { color: "#4A4458" },
  punctuation: { color: "#8B8599" },
  property: { color: "#E2A63B" },
  tag: { color: "#E2A63B" },
  boolean: { color: "#E2A63B" },
  number: { color: "#E2A63B" },
  constant: { color: "#E2A63B" },
  symbol: { color: "#E2A63B" },
  deleted: { color: "#9E2B3E" },
  selector: { color: "#7EC699" },
  "attr-name": { color: "#7EC699" },
  string: { color: "#7EC699" },
  char: { color: "#7EC699" },
  builtin: { color: "#7EC699" },
  inserted: { color: "#7EC699" },
  operator: { color: "#EDE8DC" },
  entity: { color: "#EDE8DC" },
  url: { color: "#EDE8DC" },
  atrule: { color: "#C792EA" },
  "attr-value": { color: "#C792EA" },
  keyword: { color: "#C792EA" },
  function: { color: "#82AAFF" },
  "class-name": { color: "#82AAFF" },
  regex: { color: "#F78C6C" },
  important: { color: "#F78C6C", fontWeight: "bold" },
  variable: { color: "#F07178" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const { t } = useLocale();

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="code-block-copy"
      aria-label={copied ? t("code.copiedLabel") : t("code.copyLabel")}
    >
      {copied ? t("code.copied") : t("code.copy")}
    </button>
  );
}

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const components = useMemo(
    () => ({
      code({
        className,
        children,
        ...props
      }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
        const match = /language-(\w+)/.exec(className || "");
        const codeString = String(children).replace(/\n$/, "");

        // Block code with language
        if (match) {
          return (
            <div className="my-5 border border-border rounded-lg overflow-hidden bg-surface shadow-soft">
              <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-border text-xs font-mono text-text-secondary">
                <span>{match[1]}</span>
                <CopyButton text={codeString} />
              </div>
              <SyntaxHighlighter
                style={vonssyTheme}
                language={match[1]}
                PreTag="div"
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        }

        // Block code without language
        if (codeString.includes("\n")) {
          return (
            <div className="my-5 border border-border rounded-lg overflow-hidden bg-surface shadow-soft">
              <div className="flex items-center justify-between px-4 py-2 bg-surface-raised border-b border-border text-xs font-mono text-text-secondary">
                <span>text</span>
                <CopyButton text={codeString} />
              </div>
              <pre className="p-4 overflow-auto font-mono text-sm text-bone bg-transparent m-0">
                <code>{codeString}</code>
              </pre>
            </div>
          );
        }

        // Inline code
        return (
          <code
            className="px-1.5 py-0.5 bg-wraith/20 text-ember font-mono text-[0.85em] rounded-md"
            {...props}
          >
            {children}
          </code>
        );
      },
      // Style other markdown elements
      p: ({ children, ...props }: React.ComponentPropsWithoutRef<"p">) => (
        <p className="mb-3 last:mb-0 leading-relaxed" {...props}>
          {children}
        </p>
      ),
      h1: ({ children, ...props }: React.ComponentPropsWithoutRef<"h1">) => (
        <h1 className="text-xl font-display font-bold text-ember mb-3 mt-4" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }: React.ComponentPropsWithoutRef<"h2">) => (
        <h2 className="text-lg font-display font-bold text-bone mb-2 mt-3" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }: React.ComponentPropsWithoutRef<"h3">) => (
        <h3 className="text-base font-reading font-bold text-bone mb-2 mt-3" {...props}>
          {children}
        </h3>
      ),
      ul: ({ children, ...props }: React.ComponentPropsWithoutRef<"ul">) => (
        <ul className="mb-3 ml-4 list-disc list-outside space-y-1" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }: React.ComponentPropsWithoutRef<"ol">) => (
        <ol className="mb-3 ml-4 list-decimal list-outside space-y-1" {...props}>
          {children}
        </ol>
      ),
      li: ({ children, ...props }: React.ComponentPropsWithoutRef<"li">) => (
        <li className="leading-relaxed" {...props}>
          {children}
        </li>
      ),
      blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<"blockquote">) => (
        <blockquote
          className="border-l-3 border-ember pl-4 my-3 text-bone/80 italic"
          {...props}
        >
          {children}
        </blockquote>
      ),
      a: ({ children, href, ...props }: React.ComponentPropsWithoutRef<"a">) => (
        <a
          href={href}
          className="text-ember underline underline-offset-2 hover:text-bone transition-colors"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      ),
      table: ({ children, ...props }: React.ComponentPropsWithoutRef<"table">) => (
        <div className="overflow-x-auto my-3">
          <table className="w-full border-2 border-wraith text-sm" {...props}>
            {children}
          </table>
        </div>
      ),
      th: ({ children, ...props }: React.ComponentPropsWithoutRef<"th">) => (
        <th
          className="border border-wraith px-3 py-1.5 text-left font-semibold bg-ink text-ember"
          {...props}
        >
          {children}
        </th>
      ),
      td: ({ children, ...props }: React.ComponentPropsWithoutRef<"td">) => (
        <td className="border border-wraith px-3 py-1.5" {...props}>
          {children}
        </td>
      ),
      hr: (props: React.ComponentPropsWithoutRef<"hr">) => (
        <hr className="border-wraith my-4" {...props} />
      ),
      strong: ({ children, ...props }: React.ComponentPropsWithoutRef<"strong">) => (
        <strong className="font-bold text-bone" {...props}>
          {children}
        </strong>
      ),
      em: ({ children, ...props }: React.ComponentPropsWithoutRef<"em">) => (
        <em className="italic text-bone/90" {...props}>
          {children}
        </em>
      ),
    }),
    []
  );

  return (
    <div className="markdown-content text-bone font-reading text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
