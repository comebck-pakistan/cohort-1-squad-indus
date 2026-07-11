import { type Request, type Response, type NextFunction } from "express";

const INTERNAL_API_KEY = process.env["INTERNAL_API_KEY"];

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!INTERNAL_API_KEY) {
    next();
    return;
  }

  const key =
    req.headers["x-api-key"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

  if (!key || key !== INTERNAL_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
