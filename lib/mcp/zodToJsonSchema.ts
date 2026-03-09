/**
 * Zod v4 ships a built-in `toJSONSchema()` method that outputs JSON Schema 2020-12.
 *
 * MCP requires tools to expose an `inputSchema` that is a valid JSON Schema object.
 * See MCP 2025-11-25: Tools + JSON Schema Usage.
 */
export function zodToJsonSchema2020(schema: unknown): Record<string, unknown> {
  const s = schema as Record<string, unknown> & { toJSONSchema?: () => unknown };

  // Zod v4
  if (s && typeof s.toJSONSchema === 'function') {
    const js = s.toJSONSchema();
    // Ensure it's always an object
    if (js && typeof js === 'object' && !Array.isArray(js)) return js as Record<string, unknown>;
  }

  // Safe fallback for tools with missing schemas:
  // accept only empty objects by default (recommended pattern in MCP spec).
  return { type: 'object', additionalProperties: false };
}

