import crypto from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters");
  }
  return secret;
}

export function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payloadStr = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${header}.${payloadStr}`)
    .digest("base64url");
  return `${header}.${payloadStr}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const expectedSig = crypto
      .createHmac("sha256", getJwtSecret())
      .update(`${header}.${payload}`)
      .digest("base64url");
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof decoded.exp !== "number" || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === checkHash;
}
