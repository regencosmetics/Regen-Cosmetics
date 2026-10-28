export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  if (source === 'query') { req.validatedQuery = result.data; } else { req[source] = result.data; }
  next();
};

// Rejects NoSQL operator injection ({"$gt": ""}) in any parsed input before it reaches a controller.
export function rejectOperators(req, _res, next) {
  const bad = (o, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 8) return false;
    for (const k of Object.keys(o)) {
      if (k.startsWith('$')) return true;
      if (bad(o[k], depth + 1)) return true;
    }
    return false;
  };
  if (bad(req.body) || bad(req.query) || bad(req.params)) {
    const e = new Error('Invalid input'); e.status = 400; e.code = 'INVALID_INPUT'; e.expose = true;
    return next(e);
  }
  next();
}
