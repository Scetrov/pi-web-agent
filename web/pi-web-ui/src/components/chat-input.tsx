import { useEffect, useMemo, useRef, useState } from "react";
import { SendHorizontal, Square, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SlashCommandMeta } from "@/types/chat";

interface ChatInputProps {
  connectionLabel: string;
  slashCommands: SlashCommandMeta[];
  disabled?: boolean;
  isStreaming?: boolean;
  onSend: (prompt: string) => Promise<void>;
  onStop: () => Promise<void>;
}

interface SlashMatch {
  start: number;
  end: number;
  query: string;
}

function getSlashMatch(value: string, caret: number): SlashMatch | undefined {
  const beforeCaret = value.slice(0, caret);
  const tokenStart = Math.max(
    beforeCaret.lastIndexOf(" "),
    beforeCaret.lastIndexOf("\n"),
    beforeCaret.lastIndexOf("\t"),
  ) + 1;
  const token = value.slice(tokenStart, caret);

  if (!token.startsWith("/")) {
    return undefined;
  }

  if (token.includes(" ")) {
    return undefined;
  }

  return {
    start: tokenStart,
    end: caret,
    query: token.slice(1).toLowerCase(),
  };
}

function commandLabel(command: SlashCommandMeta): string {
  return `/${command.name}`;
}

const WEB_SUPPORTED_BUILTIN_COMMANDS = new Set(["new"]);

function sourceVariant(source: SlashCommandMeta["source"]): "outline" | "secondary" {
  return source === "builtin" ? "outline" : "secondary";
}

function isCommandSupportedInWeb(command: SlashCommandMeta): boolean {
  if (command.source !== "builtin") {
    return true;
  }

  return WEB_SUPPORTED_BUILTIN_COMMANDS.has(command.name);
}

export function ChatInput({
  connectionLabel,
  slashCommands,
  disabled = false,
  isStreaming = false,
  onSend,
  onStop,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dismissedQuery, setDismissedQuery] = useState<string>();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const slashMatch = useMemo(() => getSlashMatch(value, caret), [value, caret]);
  const suggestions = useMemo(() => {
    if (!slashMatch || dismissedQuery === slashMatch.query) {
      return [];
    }

    const query = slashMatch.query;
    const normalized = query.toLowerCase();
    const ranked = slashCommands
      .filter((command) => {
        if (!normalized) {
          return true;
        }
        return command.name.toLowerCase().includes(normalized);
      })
      .sort((left, right) => {
        const leftStarts = left.name.toLowerCase().startsWith(normalized);
        const rightStarts = right.name.toLowerCase().startsWith(normalized);
        if (leftStarts !== rightStarts) {
          return leftStarts ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });

    return ranked.slice(0, 8);
  }, [dismissedQuery, slashCommands, slashMatch]);

  const supportedSuggestions = useMemo(
    () => suggestions.filter((command) => isCommandSupportedInWeb(command)),
    [suggestions],
  );
  const activeSuggestion = supportedSuggestions[selectedIndex];
  const hasSuggestions = suggestions.length > 0;

  useEffect(() => {
    setSelectedIndex(0);
    if ((slashMatch?.query ?? undefined) !== dismissedQuery) {
      setDismissedQuery(undefined);
    }
  }, [dismissedQuery, slashMatch?.query]);

  useEffect(() => {
    if (supportedSuggestions.length === 0 && selectedIndex !== 0) {
      setSelectedIndex(0);
      return;
    }

    if (selectedIndex >= supportedSuggestions.length && supportedSuggestions.length > 0) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, supportedSuggestions]);

  const applySuggestion = (command: SlashCommandMeta) => {
    if (!slashMatch) {
      return;
    }

    const insertion = `${commandLabel(command)} `;
    const nextValue = `${value.slice(0, slashMatch.start)}${insertion}${value.slice(caret)}`;
    const nextCaret = slashMatch.start + insertion.length;
    setValue(nextValue);
    setCaret(nextCaret);
    setDismissedQuery(undefined);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const submit = async () => {
    const next = value.trim();
    if (!next || disabled || isStreaming) {
      return;
    }
    setValue("");
    setCaret(0);
    await onSend(next);
  };

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setCaret(event.target.selectionStart ?? event.target.value.length);
            setDismissedQuery(undefined);
          }}
          onClick={(event) => {
            setCaret(event.currentTarget.selectionStart ?? 0);
          }}
          onKeyUp={(event) => {
            setCaret(event.currentTarget.selectionStart ?? 0);
          }}
          onKeyDown={(event) => {
            if (hasSuggestions) {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (supportedSuggestions.length > 0) {
                  setSelectedIndex((current) => (current + 1) % supportedSuggestions.length);
                }
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                if (supportedSuggestions.length > 0) {
                  setSelectedIndex((current) => (current - 1 + supportedSuggestions.length) % supportedSuggestions.length);
                }
                return;
              }
              if (event.key === "Tab" || event.key === "Enter") {
                if (!(event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  if (activeSuggestion) {
                    applySuggestion(activeSuggestion);
                  }
                  return;
                }
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDismissedQuery(slashMatch?.query ?? "");
                return;
              }
            }

            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Ask Pi something…"
          disabled={disabled}
          className={`min-h-24 resize-y border-border/60 bg-background/60${!isStreaming && !disabled ? ' input-ready-border' : ''}`}
        />

        {hasSuggestions ? (
          <div className="absolute inset-x-0 bottom-2 mx-2 border border-border/70 bg-card/96 shadow-lg shadow-black/20 backdrop-blur-sm">
            <div className="border-b border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Slash commands
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {suggestions.map((command) => {
                const supported = isCommandSupportedInWeb(command);
                const active = supported && activeSuggestion?.name === command.name && activeSuggestion.source === command.source;
                return (
                  <button
                    key={`${command.source}-${command.name}`}
                    type="button"
                    disabled={!supported}
                    aria-disabled={!supported}
                    className={`flex w-full items-start gap-2 px-2 py-1.5 text-left ${supported ? active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground" : "cursor-not-allowed opacity-45"}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      if (!supported) {
                        return;
                      }
                      applySuggestion(command);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={supported ? "font-mono text-[11px] leading-5 text-foreground" : "font-mono text-[11px] leading-5 text-muted-foreground"}>
                        {commandLabel(command)}
                      </div>
                      {command.description ? (
                        <div className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                          {command.description}
                          {!supported ? " · Not supported in web UI" : ""}
                        </div>
                      ) : !supported ? (
                        <div className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                          Not supported in web UI
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!supported ? (
                        <Badge variant="outline" className="mt-0.5 text-[10px] text-muted-foreground">
                          unsupported
                        </Badge>
                      ) : null}
                      <Badge variant={sourceVariant(command.source)} className="mt-0.5 text-[10px] capitalize">
                        {command.source}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>Type / for commands • Meta/Ctrl+Enter to send</div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="connected-indicator connected-indicator--compact">
            <Wifi className="size-3.5" />
            <span>{connectionLabel}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void onStop()}
            disabled={!isStreaming}
          >
            <Square className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void submit()}
            disabled={disabled || isStreaming}
          >
            <SendHorizontal className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
