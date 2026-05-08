import type {
  ResourceHealthIssue,
  SessionMeta,
  SlashCommandMeta,
  WebSession,
} from "./types.js";

const BUILTIN_SLASH_COMMANDS: ReadonlyArray<{
  name: string;
  description: string;
}> = [
  { name: "settings", description: "Open settings menu" },
  { name: "model", description: "Select model (opens selector UI)" },
  {
    name: "scoped-models",
    description: "Enable/disable models for Ctrl+P cycling",
  },
  {
    name: "export",
    description: "Export session (HTML default, or specify path: .html/.jsonl)",
  },
  {
    name: "import",
    description: "Import and resume a session from a JSONL file",
  },
  { name: "share", description: "Share session as a secret GitHub gist" },
  { name: "copy", description: "Copy last agent message to clipboard" },
  { name: "name", description: "Set session display name" },
  { name: "session", description: "Show session info and stats" },
  { name: "changelog", description: "Show changelog entries" },
  { name: "hotkeys", description: "Show all keyboard shortcuts" },
  {
    name: "fork",
    description: "Create a new fork from a previous user message",
  },
  {
    name: "clone",
    description: "Duplicate the current session at the current position",
  },
  { name: "tree", description: "Navigate session tree (switch branches)" },
  { name: "login", description: "Configure provider authentication" },
  { name: "logout", description: "Remove provider authentication" },
  { name: "new", description: "Start a new session" },
  {
    name: "compact",
    description: "Manually compact the session context",
  },
  { name: "resume", description: "Resume a different session" },
  {
    name: "reload",
    description: "Reload keybindings, extensions, skills, prompts, and themes",
  },
  { name: "quit", description: "Quit pi" },
];

function collectIssues(entry: WebSession): ResourceHealthIssue[] {
  const loader = entry.resourceLoader;
  const extensionErrors = loader
    .getExtensions()
    .errors.map<ResourceHealthIssue>((error) => ({
      kind: "extension",
      severity: "error",
      message: error.error,
      path: error.path,
    }));

  const mapDiagnostics = (
    kind: ResourceHealthIssue["kind"],
    diagnostics: Array<{ type: string; message: string; path?: string }>,
  ): ResourceHealthIssue[] => {
    return diagnostics.map((diagnostic) => ({
      kind,
      severity: diagnostic.type === "error" ? "error" : "warning",
      message: diagnostic.message,
      path: diagnostic.path,
    }));
  };

  return [
    ...extensionErrors,
    ...mapDiagnostics("skill", loader.getSkills().diagnostics),
    ...mapDiagnostics("prompt", loader.getPrompts().diagnostics),
    ...mapDiagnostics("theme", loader.getThemes().diagnostics),
  ];
}

function buildSlashCommands(entry: WebSession): SlashCommandMeta[] {
  const loader = entry.resourceLoader;
  const builtin = BUILTIN_SLASH_COMMANDS.map<SlashCommandMeta>((command) => ({
    name: command.name,
    description: command.description,
    source: "builtin",
  }));

  const extensionCommands = Array.from(loader.getExtensions().extensions)
    .flatMap((extension) => Array.from(extension.commands.values()))
    .map<SlashCommandMeta>((command) => ({
      name: command.name,
      description: command.description,
      source: "extension",
    }));

  const promptCommands = loader.getPrompts().prompts.map<SlashCommandMeta>((prompt) => ({
    name: prompt.name,
    description: prompt.description,
    source: "prompt",
  }));

  const skillCommands = loader.getSkills().skills.map<SlashCommandMeta>((skill) => ({
    name: `skill:${skill.name}`,
    description: skill.description,
    source: "skill",
  }));

  const deduped = new Map<string, SlashCommandMeta>();
  for (const command of [...builtin, ...extensionCommands, ...promptCommands, ...skillCommands]) {
    if (!deduped.has(command.name)) {
      deduped.set(command.name, command);
    }
  }

  return [...deduped.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function buildSessionMeta(entry: WebSession, cwd: string): SessionMeta {
  const session = entry.session;
  const loader = entry.resourceLoader;

  return {
    sessionId: entry.sessionId,
    title: session.sessionName,
    cwd,
    model: session.model
      ? {
          provider: session.model.provider,
          id: session.model.id,
        }
      : undefined,
    thinkingLevel: session.thinkingLevel,
    usingSubscription: session.model
      ? session.modelRegistry.isUsingOAuth(session.model)
      : false,
    autoCompactEnabled: session.autoCompactionEnabled,
    activeTools: session.getActiveToolNames(),
    toolCount: session.getAllTools().length,
    slashCommands: buildSlashCommands(entry),
    resourceCounts: {
      extensions: loader.getExtensions().extensions.length,
      skills: loader.getSkills().skills.length,
      prompts: loader.getPrompts().prompts.length,
      themes: loader.getThemes().themes.length,
      contextFiles: loader.getAgentsFiles().agentsFiles.length,
    },
    resourceHealth: collectIssues(entry),
    usage: session.getSessionStats(),
  };
}
