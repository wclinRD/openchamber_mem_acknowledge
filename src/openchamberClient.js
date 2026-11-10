export function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const sanitizeError = (message) => {
  if (!message) return "Unknown error";
  return message.replace(/token|secret|authorization/gi, "[REDACTED]");
};

export async function callOpenChamberTool(ctx, toolName, input) {
  const endpoint = process.env.OPENCHAMBER_AGENT_TOOL_URL;
  const token = process.env.OPENCHAMBER_AGENT_TOOL_TOKEN;

  if (!endpoint || !validateUrl(endpoint) || !token) {
    return {
      content: JSON.stringify({
        schemaVersion: 1,
        ok: false,
        action: input?.action || toolName,
        error: { message: "OPENCHAMBER_MANAGED_TOOL_UNAVAILABLE", kind: "configuration" },
      }),
      metadata: {
        openchamber: {
          schemaVersion: 1,
          action: input?.action || toolName,
          ok: false,
        },
      },
    };
  }

  const payload = {
    input,
    sessionID: ctx.sessionID,
    callID: ctx.id,
    tool: toolName,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: ctx.signal,
    });

    const text = await response.text();
    let result = null;
    try {
      result = JSON.parse(text);
    } catch {
      return {
        content: text,
        metadata: {
          openchamber: {
            schemaVersion: 1,
            action: input?.action || toolName,
            ok: false,
            error: {
              message: sanitizeError(`OpenChamber returned invalid response status: ${response.status}`),
              kind: "runtime",
              status: response.status,
            },
          },
        },
      };
    }

    const valid = result?.schemaVersion === 1 && typeof result?.ok === "boolean" && typeof result?.action === "string";
    if (valid) {
      return {
        content: text,
        metadata: {
          openchamber: {
            schemaVersion: 1,
            action: result.action,
            ok: result.ok,
          },
        },
      };
    }

    return {
      content: JSON.stringify({
        schemaVersion: 1,
        ok: false,
        action: input?.action || toolName,
        error: {
          message: sanitizeError("OpenChamber returned an invalid response"),
          kind: "runtime",
          status: response.status,
        },
      }),
      metadata: {
        openchamber: {
          schemaVersion: 1,
          action: input?.action || toolName,
          ok: false,
        },
      },
    };
  } catch (error) {
    return {
      content: JSON.stringify({
        schemaVersion: 1,
        ok: false,
        action: input?.action || toolName,
        error: {
          message: sanitizeError(error instanceof Error ? error.message : String(error)),
          kind: "runtime",
        },
      }),
      metadata: {
        openchamber: {
          schemaVersion: 1,
          action: input?.action || toolName,
          ok: false,
        },
      },
    };
  }
}
