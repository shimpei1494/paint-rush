import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  DEFAULT_GRID_SIZE,
  DEFAULT_PLAYER_NAME,
  MAX_PLAYERS,
  PALETTE,
  ROOM_CODE_LENGTH,
  isPaletteColor,
} from "./constants";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function normalizeName(name: string): string {
  const trimmed = name.trim().slice(0, 20);
  return trimmed.length > 0 ? trimmed : DEFAULT_PLAYER_NAME;
}

async function findRoomByCode(
  ctx: MutationCtx,
  code: string,
): Promise<Doc<"rooms"> | null> {
  return await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
}

async function getPlayer(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  playerId: string,
): Promise<Doc<"players"> | null> {
  return await ctx.db
    .query("players")
    .withIndex("by_room_and_player", (q) =>
      q.eq("roomId", roomId).eq("playerId", playerId),
    )
    .unique();
}

export const createRoom = mutation({
  args: {
    playerId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // 衝突したら最大10回まで別コードで再試行する
    let code: string | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = randomCode();
      const existing = await findRoomByCode(ctx, candidate);
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (code === null) {
      throw new Error("部屋コードの生成に失敗しました。もう一度お試しください。");
    }

    const roomId = await ctx.db.insert("rooms", {
      code,
      hostPlayerId: args.playerId,
      status: "lobby",
      roundId: 0,
      gridSize: DEFAULT_GRID_SIZE,
    });

    await ctx.db.insert("players", {
      roomId,
      playerId: args.playerId,
      name: normalizeName(args.name),
      color: PALETTE[0],
    });

    return { code, roomId };
  },
});

export const joinRoom = mutation({
  args: {
    code: v.string(),
    playerId: v.string(),
    name: v.string(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), roomId: v.id("rooms") }),
    v.object({
      ok: v.literal(false),
      reason: v.union(
        v.literal("notFound"),
        v.literal("full"),
        v.literal("inProgress"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const room = await findRoomByCode(ctx, args.code.toUpperCase());
    if (!room) {
      return { ok: false as const, reason: "notFound" as const };
    }

    // 同じ playerId の再入室は status に関係なく許可(リロード対応、設計メモ D6)
    const existing = await getPlayer(ctx, room._id, args.playerId);
    if (existing) {
      const newName = normalizeName(args.name);
      if (existing.name !== newName) {
        await ctx.db.patch("players", existing._id, { name: newName });
      }
      return { ok: true as const, roomId: room._id };
    }

    if (room.status !== "lobby") {
      return { ok: false as const, reason: "inProgress" as const };
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .take(MAX_PLAYERS + 1);
    if (players.length >= MAX_PLAYERS) {
      return { ok: false as const, reason: "full" as const };
    }

    const usedColors = new Set(players.map((p) => p.color));
    const color = PALETTE.find((c) => !usedColors.has(c)) ?? PALETTE[0];

    await ctx.db.insert("players", {
      roomId: room._id,
      playerId: args.playerId,
      name: normalizeName(args.name),
      color,
    });

    return { ok: true as const, roomId: room._id };
  },
});

export const changeColor = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room || room.status !== "lobby") {
      // ロビーを抜けた後の古いUIクリックの可能性があるだけなので、throwしない
      return { ok: false };
    }

    if (!isPaletteColor(args.color)) {
      throw new Error("無効な色です。");
    }

    const player = await getPlayer(ctx, args.roomId, args.playerId);
    if (!player) {
      throw new Error("プレイヤーが見つかりません。");
    }

    // 同色の重複は意図的に許可する(=チーム)
    await ctx.db.patch("players", player._id, { color: args.color });
    return { ok: true };
  },
});

export const getRoom = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
    if (!room) {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .take(MAX_PLAYERS);

    return { room, players };
  },
});
