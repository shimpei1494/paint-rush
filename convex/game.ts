import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  COUNTDOWN_MS,
  MAX_GRID_CELLS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PAINT_COOLDOWN_MS,
  ROUND_MS,
} from "./constants";

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

// 盤面外周を左上から時計回りに一周したときの p 番目のマス座標(p は 0 〜 4*(size-1)-1)
function perimeterCell(p: number, size: number): { x: number; y: number } {
  const edge = size - 1;
  if (p < edge) return { x: p, y: 0 };
  if (p < 2 * edge) return { x: edge, y: p - edge };
  if (p < 3 * edge) return { x: edge - (p - 2 * edge), y: edge };
  return { x: 0, y: edge - (p - 3 * edge) };
}

export const startGame = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      throw new Error("部屋が見つかりません。");
    }
    if (room.hostPlayerId !== args.playerId) {
      throw new Error("ホストのみがゲームを開始できます。");
    }
    if (room.status !== "lobby") {
      return { ok: false as const, reason: "notLobby" as const };
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(MAX_PLAYERS);
    if (players.length < MIN_PLAYERS) {
      return { ok: false as const, reason: "notEnoughPlayers" as const };
    }

    const nextRound = room.roundId + 1;
    const startsAt = Date.now() + COUNTDOWN_MS;
    const endsAt = startsAt + ROUND_MS;

    // 各プレイヤーのスタートマスを盤面外周に等間隔で配置する(戦略性改善検討 S1)。
    // ロビー時点で盤面は必ず空(resetRoom が cells を消してから lobby に戻す)なので insert でよい。
    // 最小盤面12でも外周44マス÷最大8人で間隔5マス以上あり、位置が衝突することはない
    const perimeter = 4 * (room.gridSize - 1);
    const offset = Math.floor(Math.random() * perimeter);
    const startCells = players.map((player, i) => {
      const pos =
        (offset + Math.floor((i * perimeter) / players.length)) % perimeter;
      return { ...perimeterCell(pos, room.gridSize), color: player.color };
    });
    for (const cell of startCells) {
      await ctx.db.insert("cells", {
        roomId: args.roomId,
        x: cell.x,
        y: cell.y,
        color: cell.color,
      });
    }

    await ctx.db.patch("rooms", args.roomId, {
      status: "countdown",
      roundId: nextRound,
      startsAt,
      endsAt,
      startCells,
    });

    await ctx.scheduler.runAt(startsAt, internal.game.beginPlaying, {
      roomId: args.roomId,
      roundId: nextRound,
    });
    await ctx.scheduler.runAt(endsAt, internal.game.endGame, {
      roomId: args.roomId,
      roundId: nextRound,
    });

    return { ok: true as const };
  },
});

// スケジューラから呼ばれる。resetRoom で roundId が進んでいたら「幽霊発火」なので何もしない(設計メモ D1)
export const beginPlaying = internalMutation({
  args: {
    roomId: v.id("rooms"),
    roundId: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room || room.roundId !== args.roundId || room.status !== "countdown") {
      return null;
    }
    await ctx.db.patch("rooms", args.roomId, { status: "playing" });
    return null;
  },
});

export const endGame = internalMutation({
  args: {
    roomId: v.id("rooms"),
    roundId: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room || room.roundId !== args.roundId || room.status !== "playing") {
      return null;
    }
    await ctx.db.patch("rooms", args.roomId, { status: "finished" });
    return null;
  },
});

export const paint = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      throw new Error("部屋が見つかりません。");
    }
    const player = await getPlayer(ctx, args.roomId, args.playerId);
    if (!player) {
      throw new Error("プレイヤーが見つかりません。");
    }
    if (
      !Number.isInteger(args.x) ||
      !Number.isInteger(args.y) ||
      args.x < 0 ||
      args.x >= room.gridSize ||
      args.y < 0 ||
      args.y >= room.gridSize
    ) {
      throw new Error("座標が範囲外です。");
    }

    const now = Date.now();

    // 連打・時間外タップは正常系なので throw せず ok:false を返す(設計メモ D2)
    if (
      room.status !== "playing" ||
      room.startsAt === undefined ||
      room.endsAt === undefined ||
      now < room.startsAt ||
      now > room.endsAt
    ) {
      return { ok: false as const, reason: "notPlaying" as const };
    }

    // クールダウンは players ではなく cooldowns から読む。players を毎タップ書き換えると
    // players を読んでいる getRoom が全員ぶん再送されてしまうため(設計メモ D11)
    const cooldown = await ctx.db
      .query("cooldowns")
      .withIndex("by_room_and_player", (q) =>
        q.eq("roomId", args.roomId).eq("playerId", args.playerId),
      )
      .unique();
    if (cooldown && now - cooldown.lastPaintedAt < PAINT_COOLDOWN_MS) {
      return { ok: false as const, reason: "cooldown" as const };
    }

    // スタートマスは奪われない。全マスを失って詰むことへの救済(戦略性改善検討 S1)
    const startCell = (room.startCells ?? []).find(
      (s) => s.x === args.x && s.y === args.y,
    );
    if (startCell && startCell.color !== player.color) {
      return { ok: false as const, reason: "protectedCell" as const };
    }

    // 隣接ルール: 自色マスの4近傍だけ塗れる(戦略性改善検討 S1)。
    // 連結性の厳密判定はせず「タップした瞬間に自色隣接ならOK」のみ(インデックス point read 4件)
    const neighborCells = await Promise.all(
      [
        [args.x - 1, args.y],
        [args.x + 1, args.y],
        [args.x, args.y - 1],
        [args.x, args.y + 1],
      ]
        .filter(
          ([nx, ny]) =>
            nx >= 0 && nx < room.gridSize && ny >= 0 && ny < room.gridSize,
        )
        .map(([nx, ny]) =>
          ctx.db
            .query("cells")
            .withIndex("by_room_and_pos", (q) =>
              q.eq("roomId", args.roomId).eq("x", nx).eq("y", ny),
            )
            .unique(),
        ),
    );
    if (!neighborCells.some((c) => c !== null && c.color === player.color)) {
      return { ok: false as const, reason: "notAdjacent" as const };
    }

    // 色は引数ではなく player.color から決める(なりすまし防止、設計メモ D5)
    const existingCell = await ctx.db
      .query("cells")
      .withIndex("by_room_and_pos", (q) =>
        q.eq("roomId", args.roomId).eq("x", args.x).eq("y", args.y),
      )
      .unique();

    if (existingCell) {
      if (existingCell.color !== player.color) {
        await ctx.db.patch("cells", existingCell._id, { color: player.color });
      }
    } else {
      await ctx.db.insert("cells", {
        roomId: args.roomId,
        x: args.x,
        y: args.y,
        color: player.color,
      });
    }

    if (cooldown) {
      await ctx.db.patch("cooldowns", cooldown._id, { lastPaintedAt: now });
    } else {
      await ctx.db.insert("cooldowns", {
        roomId: args.roomId,
        playerId: args.playerId,
        lastPaintedAt: now,
      });
    }

    return { ok: true as const };
  },
});

export const endRoundByHost = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      throw new Error("部屋が見つかりません。");
    }
    if (room.hostPlayerId !== args.playerId) {
      throw new Error("ホストのみが終了できます。");
    }
    if (room.status !== "countdown" && room.status !== "playing") {
      return { ok: false as const, reason: "notInProgress" as const };
    }

    // roundId は進めない。予約済みの beginPlaying / endGame は status チェックで空振りするため(設計メモ D1 の応用)
    await ctx.db.patch("rooms", args.roomId, {
      status: "finished",
      endsAt: Date.now(),
    });

    return { ok: true as const };
  },
});

export const resetRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get("rooms", args.roomId);
    if (!room) {
      throw new Error("部屋が見つかりません。");
    }
    if (room.hostPlayerId !== args.playerId) {
      throw new Error("ホストのみがリセットできます。");
    }

    const cells = await ctx.db
      .query("cells")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(MAX_GRID_CELLS);
    for (const cell of cells) {
      await ctx.db.delete("cells", cell._id);
    }

    const cooldowns = await ctx.db
      .query("cooldowns")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(MAX_PLAYERS);
    for (const cooldown of cooldowns) {
      await ctx.db.delete("cooldowns", cooldown._id);
    }

    // roundId を進めることで、予約済みの beginPlaying / endGame を無効化する(設計メモ D1)
    await ctx.db.patch("rooms", args.roomId, {
      status: "lobby",
      roundId: room.roundId + 1,
      startsAt: undefined,
      endsAt: undefined,
      startCells: undefined,
    });

    return { ok: true as const };
  },
});

export const getCells = query({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.array(
    v.object({ x: v.number(), y: v.number(), color: v.string() }),
  ),
  handler: async (ctx, args) => {
    const cells = await ctx.db
      .query("cells")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .take(MAX_GRID_CELLS);
    // スコア集計はクライアント側で行う(設計メモ D4)
    return cells.map((c) => ({ x: c.x, y: c.y, color: c.color }));
  },
});
