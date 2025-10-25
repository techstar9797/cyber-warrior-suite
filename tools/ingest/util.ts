import crypto from 'node:crypto';

export const uid = (...parts: (string | number | undefined)[]) =>
  crypto
    .createHash('sha1')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

export const nowIso = () => new Date().toISOString();

export const DEFAULT_FUNC = process.env.INGEST_FUNCTION_DEFAULT || 'soc';

