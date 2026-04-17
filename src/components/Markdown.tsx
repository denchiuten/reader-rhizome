import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  a: ({ node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline-offset-2 hover:underline"
    />
  ),
  p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
  ul: ({ node, ...props }) => (
    <ul {...props} className="mb-2 list-disc space-y-1 pl-5 last:mb-0" />
  ),
  ol: ({ node, ...props }) => (
    <ol {...props} className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" />
  ),
  code: ({ node, className, ...props }) => (
    <code
      {...props}
      className={cn(
        "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]",
        className,
      )}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      {...props}
      className="my-2 border-l-2 border-border pl-3 italic text-foreground/70"
    />
  ),
  h1: ({ node, ...props }) => (
    <h1 {...props} className="mb-2 text-base font-semibold" />
  ),
  h2: ({ node, ...props }) => (
    <h2 {...props} className="mb-2 text-base font-semibold" />
  ),
  h3: ({ node, ...props }) => (
    <h3 {...props} className="mb-2 text-sm font-semibold" />
  ),
};

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("[&>*:last-child]:mb-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
