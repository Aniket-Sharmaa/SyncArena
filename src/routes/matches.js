import { Router } from "express";
import { createMatchSchema, listMatchesQuerySchema } from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();
const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: JSON.stringify(parsed.error),
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    return res.json({ data });
  } catch (e) {
    return res.status(500).json({
      error: "Failed to fetch matches",
      details: e?.message ?? String(e),
    });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: JSON.stringify(parsed.error),
    });
  }

  const { startTime, endTime, homeScore, awayScore, status, ...rest } = parsed.data;

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...rest,
        startTime: start,
        endTime: end,
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: status ?? getMatchStatus(start, end),
      })
      .returning();

    return res.status(201).json({
      message: "Match created successfully",
      data: event,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Failed to create match",
      details: e?.message ?? String(e),
    });
  }
});