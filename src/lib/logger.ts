type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: LogLevel, msg: string, fields: LogFields = {}): void {
  const base = {
    t: new Date().toISOString(),
    level,
    msg,
    ...scrub(fields),
  };
  const line = JSON.stringify(base);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Do not let raw PII leak into logs.
function scrub(fields: LogFields): LogFields {
  const clean: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (["email", "phone", "phoneE164", "recipientEmail", "recipientPhoneE164", "body", "password", "passwordHash", "token", "authorization"].includes(k)) {
      if (typeof v === "string" && v.length > 0) {
        clean[k] = `[redacted:${v.length}]`;
      } else {
        clean[k] = "[redacted]";
      }
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export const log = {
  debug: (msg: string, fields?: LogFields) => {
    if (process.env.NODE_ENV !== "production") emit("debug", msg, fields);
  },
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};
