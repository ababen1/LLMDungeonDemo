/**
 * Extract JSON from LLM response (thinking block + optional fences).
 * @param {string} rawText
 * @returns {string}
 */
export function extractJSON(rawText) {
  let text = rawText.trim();

  const thinkingEnd = text.lastIndexOf('</think>');
  if (thinkingEnd !== -1) {
    text = text.slice(thinkingEnd + '</think>'.length).trim();
  }

  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response');
  }

  return text.slice(start, end + 1);
}

/**
 * @param {string} rawText
 * @returns {object}
 */
export function parseJSON(rawText) {
  const jsonStr = extractJSON(rawText);
  return JSON.parse(jsonStr);
}
