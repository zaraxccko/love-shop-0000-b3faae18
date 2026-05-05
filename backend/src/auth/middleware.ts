import { FastifyReply, FastifyRequest } from "fastify";
import { isAdminTgId, isModeratorTgId } from "./telegram.js";
import { prisma } from "../db.js";

// NOTE: `request.user` shape is augmented in src/types/fastify-jwt.d.ts
// via the @fastify/jwt FastifyJWT interface ({ tgId: bigint; isAdmin: boolean; isModerator: boolean }).

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await req.jwtVerify<{ tgId: string }>();
    if (!decoded || typeof decoded !== "object" || !("tgId" in decoded)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const tgId = BigInt(decoded.tgId);
    const dbUser = await prisma.user.findUnique({ where: { tgId }, select: { isBanned: true } });
    if (dbUser?.isBanned) {
      return reply.code(403).send({ error: "banned" });
    }
    req.user = { tgId, isAdmin: isAdminTgId(tgId), isModerator: isModeratorTgId(tgId) };
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (!req.user?.isAdmin) {
    return reply.code(403).send({ error: "forbidden" });
  }
}

/** Allow both full admins and read-only moderators. */
export async function requireAdminOrModerator(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (!req.user?.isAdmin && !req.user?.isModerator) {
    return reply.code(403).send({ error: "forbidden" });
  }
}

