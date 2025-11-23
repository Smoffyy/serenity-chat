/**
 * Interface for the parsed content.
 */
interface ParsedReasoning {
  reasoningContent: string;
  mainContent: string;
}

/**
 * Parses the raw model output string, separating the reasoning content
 * enclosed in <think>...</think> tags from the final user-facing content.
 */
export function parseReasoning(content: string): ParsedReasoning {
  if (!content) {
    return { reasoningContent: "", mainContent: "" };
  }

  // Regex to find the <think>...</think> block
  const regex = /<think>(.*?)<\/think>/s;
  const match = content.match(regex);

  // Case 1: Reasoning block is complete
  if (match && match[1]) {
    return {
      reasoningContent: match[1].trim(),
      mainContent: content.replace(regex, "").trim(),
    };
  }

  // Case 2: Reasoning block is currently streaming (open tag but no close tag)
  const openTagIndex = content.indexOf("<think>");
  if (openTagIndex !== -1) {
    return {
      reasoningContent: content.substring(openTagIndex + 7).trim(), // +7 is length of <think>
      mainContent: "", // If reasoning is still streaming, we assume main content hasn't started
    };
  }

  // Case 3: No reasoning block
  return {
    reasoningContent: "",
    mainContent: content,
  };
}