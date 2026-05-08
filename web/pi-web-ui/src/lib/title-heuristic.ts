const SOFT_LEAD_INS = [
  /^please\s+/i,
  /^can you\s+/i,
  /^could you\s+/i,
  /^would you\s+/i,
  /^help me\s+(?:to\s+)?/i,
  /^i need (?:you\s+)?to\s+/i,
  /^let'?s\s+/i,
];

function stripSoftLeadIns(input: string): string {
  return SOFT_LEAD_INS.reduce(
    (value, pattern) => value.replace(pattern, ""),
    input.trim(),
  );
}

function firstSentence(input: string): string {
  const match = input.match(/^[^.!?\n]+/);
  return (match?.[0] ?? input).trim();
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function trimPunctuation(input: string): string {
  return input.replace(/^[\s"'`-]+|[\s"'`.,:;!?-]+$/g, "").trim();
}

export function buildTitleFromPrompt(
  input: string,
  maxLength = 60,
): string | null {
  const candidate = trimPunctuation(
    normalizeWhitespace(firstSentence(stripSoftLeadIns(input))),
  );
  if (!candidate) {
    return null;
  }

  if (candidate.length <= maxLength) {
    return candidate;
  }

  const truncated = candidate.slice(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(" ");
  return trimPunctuation(
    lastSpace > 24 ? truncated.slice(0, lastSpace) : truncated,
  );
}
