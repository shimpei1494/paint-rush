import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostPlayerId: v.string(),
    status: v.union(
      v.literal("lobby"),
      v.literal("countdown"),
      v.literal("playing"),
      v.literal("finished"),
    ),
    roundId: v.number(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    gridSize: v.number(),
    // ラウンドごとのスタートマス。奪われない保護マスなので cells とは別に rooms 側で持つ
    // (最大8件の小さな配列。paint は毎回 rooms を読むので追加の読み取りコストなし)
    startCells: v.optional(
      v.array(v.object({ x: v.number(), y: v.number(), color: v.string() })),
    ),
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    name: v.string(),
    color: v.string(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_and_player", ["roomId", "playerId"]),

  // クールダウンは毎タップ書き換わる高頻度データなので players から分離する(設計メモ D11)
  cooldowns: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    lastPaintedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_and_player", ["roomId", "playerId"]),

  cells: defineTable({
    roomId: v.id("rooms"),
    x: v.number(),
    y: v.number(),
    color: v.string(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_and_pos", ["roomId", "x", "y"]),
});
