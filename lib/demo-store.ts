/**
 * Centralized demo localStorage layer.
 *
 * All demo-mode reads/writes go through this module so that:
 *  - localStorage keys are defined in one place (no scattered string literals)
 *  - JSON parse/stringify + fallback logic is not duplicated across pages
 *  - Types are enforced at the boundary
 */

// ── Key registry ──────────────────────────────────────────────────────────

const KEYS = {
  user: "demo_user",
  mode: "demo_mode",
  token: "demo_token",
  punchCards: "demo_punch_cards",
  redeemedPrizes: "demo_redeemed_prizes",
  registeredBusinesses: "demo_registered_businesses",
  registeredPrizes: "demo_registered_prizes",
  adminSession: "business_admin_session",
  leaderboardSettings: "leaderboard_settings",
} as const;

export { KEYS as DEMO_KEYS };

// ── Helpers ───────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function getJson<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setJson<T>(key: string, value: T): void {
  if (!isClient()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Typed accessors ───────────────────────────────────────────────────────

export interface DemoPunchCard {
  id: string;
  user_id: string;
  business_id: string;
  current_punches: number;
  total_punches: number;
  updated_at?: string;
  business?: {
    id: string;
    name: string;
    description: string;
    max_punches: number;
  };
}

export interface DemoRedeemedPrize {
  id: string;
  prize_id: string;
  business_id: string;
  user_id: string;
  redeemed_at: string;
  prize: { name: string; description: string };
  business: { name: string };
}

export interface DemoBusiness {
  id: string;
  name: string;
  description: string;
  max_punches: number;
  nfc_tag_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DemoPrize {
  id: string;
  name: string;
  description: string;
  punches_required: number;
  business_id: string;
  is_active?: boolean;
}

// ── Punch cards ───────────────────────────────────────────────────────────

export function getSavedPunchCards(): DemoPunchCard[] {
  return getJson<DemoPunchCard[]>(KEYS.punchCards, []);
}

export function savePunchCards(cards: DemoPunchCard[]): void {
  setJson(KEYS.punchCards, cards);
}

export function upsertPunchCard(card: DemoPunchCard): void {
  const cards = getSavedPunchCards();
  const idx = cards.findIndex(
    (c) => c.user_id === card.user_id && c.business_id === card.business_id
  );
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.push(card);
  }
  savePunchCards(cards);
}

// ── Redeemed prizes ──────────────────────────────────────────────────────

export function getRedeemedPrizes(): DemoRedeemedPrize[] {
  return getJson<DemoRedeemedPrize[]>(KEYS.redeemedPrizes, []);
}

export function addRedeemedPrize(entry: DemoRedeemedPrize): void {
  const list = getRedeemedPrizes();
  list.push(entry);
  setJson(KEYS.redeemedPrizes, list);
}

// ── Registered businesses ────────────────────────────────────────────────

export function getRegisteredBusinesses(): DemoBusiness[] {
  return getJson<DemoBusiness[]>(KEYS.registeredBusinesses, []);
}

export function getRegisteredPrizes(): DemoPrize[] {
  return getJson<DemoPrize[]>(KEYS.registeredPrizes, []);
}

export function saveRegisteredPrizes(prizes: DemoPrize[]): void {
  setJson(KEYS.registeredPrizes, prizes);
}

// ── Admin session ────────────────────────────────────────────────────────

export interface AdminSession {
  business_id?: string;
  admin_name?: string;
  [key: string]: unknown;
}

export function getAdminSession(): AdminSession {
  return getJson<AdminSession>(KEYS.adminSession, {});
}

// ── Leaderboard settings ─────────────────────────────────────────────────

export interface LeaderboardUserSettings {
  opted_in?: boolean;
  display_name?: string;
}

export function getLeaderboardSettings(): Record<string, LeaderboardUserSettings> {
  return getJson<Record<string, LeaderboardUserSettings>>(KEYS.leaderboardSettings, {});
}

export function saveLeaderboardSettings(settings: Record<string, LeaderboardUserSettings>): void {
  setJson(KEYS.leaderboardSettings, settings);
}

// ── Merged data helpers ──────────────────────────────────────────────────

/**
 * Returns the union of built-in demo businesses and user-registered ones.
 * Dynamically imports demo-data to keep the module lazy-loadable.
 */
export async function getAllBusinesses(): Promise<DemoBusiness[]> {
  const { demoBusinesses } = await import("@/lib/demo-data");
  return [...demoBusinesses, ...getRegisteredBusinesses()];
}

export async function getAllPrizes(): Promise<DemoPrize[]> {
  const { demoPrizes } = await import("@/lib/demo-data");
  return [...demoPrizes, ...getRegisteredPrizes()];
}

/**
 * Merges saved punch cards with built-in demo data for a specific user,
 * enriching each card with business info.
 */
export async function getUserPunchCards(userId: string): Promise<DemoPunchCard[]> {
  const { demoPunchCards } = await import("@/lib/demo-data");
  const saved = getSavedPunchCards();
  const allBusinesses = await getAllBusinesses();

  // Start with demo cards for this user, preferring saved overrides
  const userCards = demoPunchCards
    .filter((c) => c.user_id === userId)
    .map((card) => {
      const override = saved.find(
        (s) => s.user_id === userId && s.business_id === card.business_id
      );
      return override || card;
    });

  // Add any saved cards that don't exist in demo data
  for (const s of saved) {
    if (
      s.user_id === userId &&
      !userCards.some((c) => c.business_id === s.business_id)
    ) {
      userCards.push(s);
    }
  }

  // Enrich with business info
  return userCards.map((card) => {
    if (card.business?.name) return card;
    const biz = allBusinesses.find((b) => b.id === card.business_id);
    return {
      ...card,
      business: biz
        ? { id: biz.id, name: biz.name, description: biz.description, max_punches: biz.max_punches }
        : card.business,
    };
  });
}
