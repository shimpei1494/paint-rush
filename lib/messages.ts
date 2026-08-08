import { MAX_PLAYERS } from "@/convex/constants";

export const JOIN_ERROR_MESSAGES: Record<string, string> = {
  notFound: "その部屋コードは見つかりません",
  full: `満員です(最大${MAX_PLAYERS}人)`,
  inProgress: "ゲーム中のため参加できません",
};
