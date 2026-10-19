import type { JSX } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const BLOCK_STYLES =
  "space-y-2 text-sm leading-relaxed [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5";

/**
 * Renders user- or AI-written text. Every surface that shows such text uses
 * this, so raw markdown never shows as plaintext. Sanitized; no raw HTML.
 * `inline` drops the paragraph wrapper for short quoted text inside a sentence.
 */
export const Markdown = ({
  children,
  inline = false,
  className = "",
}: {
  children: string;
  inline?: boolean;
  className?: string;
}): JSX.Element => {
  const markdown = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={inline ? { p: ({ children: c }) => <>{c}</> } : undefined}
    >
      {children}
    </ReactMarkdown>
  );
  if (inline) {
    return <span className={`[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 ${className}`}>{markdown}</span>;
  }
  return <div className={`${BLOCK_STYLES} ${className}`}>{markdown}</div>;
};
