import { Bot, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranscriptMessage } from "@/types/chat";

interface ChatHistoryProps {
  messages: TranscriptMessage[];
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-none border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
        Once a browser session streams a completed run, finalized user and assistant messages land here.
      </div>
    );
  }

  return (
    <section className="space-y-1.5">
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <article
            key={message.id}
            className={isUser ? "border-l border-primary/35 pl-3 py-1" : "border-l border-border/60 pl-3 py-1"}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={isUser
                  ? "mt-0.5 flex size-6 shrink-0 items-center justify-center text-primary"
                  : "mt-0.5 flex size-6 shrink-0 items-center justify-center text-muted-foreground"}
              >
                {isUser ? <UserRound className="size-3.5" /> : <Bot className="size-3.5" />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {isUser ? "User" : "Agent"}
                </div>
                {isUser ? (
                  <div className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                    {message.content}
                  </div>
                ) : (
                  <div className="message-markdown text-sm leading-6 text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
