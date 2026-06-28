export function safeJsonParse(value, fallback = {}) {
  if (typeof value !== "string") return value ?? fallback;

  const text = value.trim();

  if (!text) return fallback;

  const first = text[0];
  if (first === "{" || first === "[") {
    // Looks like JSON, try parsing
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  } else {
    return fallback;
  }
}