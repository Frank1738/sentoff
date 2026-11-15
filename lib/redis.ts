// Cache, counters, locks. In-memory fallback when no Redis URL is set.
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { Report } from "./types";

/** Longest a finished report is kept, from the NOTES key table. */
export const REPORT_TTL_SECONDS = 3 * 24 * 60 * 60;
/** A report built while the gameweek is still live only holds for an hour. */
export const LIVE_TTL_SECONDS = 60 * 60;
/** A build lock, long enough to outlive one cold build and short enough to self-heal. */
export const LOCK_TTL_SECONDS = 60;
/** Cold builds one IP may start, and the window they are counted over. */
export const IP_LIMIT = 5;
export const IP_WINDOW_SECONDS = 10 * 60;
/** Windows for the two global counters. The caps themselves are the caller's to set. */
export const GLOBAL_BUILD_WINDOW_SECONDS = 60 * 60;
export const CLAUDE_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * Reports are cached per deploy: Vercel sets the commit SHA, so every push starts a fresh cache and
 * no league is served roasts written by older code. Old keys expire on their own within three days.
 * Local dev has no SHA and uses "dev"; restarting the dev server already clears the in-memory cache.
 */
const REPORT_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev";
export const reportKey = (leagueId: number, gameweek: number) =>
  `league:${leagueId}:gw${gameweek}:${REPORT_VERSION}`;
export const lockKey = (leagueId: number) => `lock:league:${leagueId}`;
export const globalBuildKey = "rate:global:builds";
export const claudeKey = "rate:global:claude";
export const BLOCKLIST_KEY = "blocklist";

/** Counter key for one IP. The address is hashed here and never stored or logged raw. */
export function ipRateKey(ip: string): string {
  return `rate:ip:${createHash("sha256").update(ip).digest("hex")}`;
}

// --- the two backends ------------------------------------------------------

/** The handful of operations the app needs. Both backends behave the same, expiries included. */
interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Sets only if the key is free. False means someone else holds it. */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
  /** Increments and, on the first bump of a window, sets the expiry. Returns the new count. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  addMember(key: string, member: string): Promise<void>;
  isMember(key: string, member: string): Promise<boolean>;
}

/** One entry in the in-memory map. `expiresAt` is a millisecond timestamp, null for never. */
type Entry = { value: string | Set<string>; expiresAt: number | null };

/**
 * The one in-memory map for this process. It hangs off `globalThis` because Next.js loads a
 * module once per layer: a route handler and a server component get separate instances of this
 * file, so a module-level map would hide a report the API route had just saved from the page
 * that wants to render it.
 */
const MEMORY_MAP = Symbol.for("sentoff.memory-store");
type WithMemory = typeof globalThis & { [MEMORY_MAP]?: Map<string, Entry> };

function memoryMap(): Map<string, Entry> {
  const host = globalThis as WithMemory;
  host[MEMORY_MAP] ??= new Map<string, Entry>();
  return host[MEMORY_MAP];
}

function memoryStore(): Store {
  const map = memoryMap();
  const live = (key: string): Entry | null => {
    const entry = map.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      map.delete(key);
      return null;
    }
    return entry;
  };
  const until = (ttlSeconds: number) => (ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null);

  return {
    async get(key) {
      const entry = live(key);
      return entry && typeof entry.value === "string" ? entry.value : null;
    },
    async set(key, value, ttlSeconds) {
      map.set(key, { value, expiresAt: until(ttlSeconds) });
    },
    async setIfAbsent(key, value, ttlSeconds) {
      if (live(key)) return false;
      map.set(key, { value, expiresAt: until(ttlSeconds) });
      return true;
    },
    async del(key) {
      map.delete(key);
    },
    async incr(key, ttlSeconds) {
      const entry = live(key);
      const next = (entry && typeof entry.value === "string" ? Number(entry.value) || 0 : 0) + 1;
      map.set(key, { value: String(next), expiresAt: entry ? entry.expiresAt : until(ttlSeconds) });
      return next;
    },
    async addMember(key, member) {
      const entry = live(key);
      const set = entry && entry.value instanceof Set ? entry.value : new Set<string>();
      set.add(member);
      map.set(key, { value: set, expiresAt: null });
    },
    async isMember(key, member) {
      const entry = live(key);
      return entry !== null && entry.value instanceof Set && entry.value.has(member);
    },
  };
}

function upstashStore(url: string, token: string): Store {
  const redis = new Redis({ url, token });
  return {
    async get(key) {
      const value = await redis.get<unknown>(key);
      if (value === null || value === undefined) return null;
      // Upstash parses JSON bodies for us, so a saved report comes back as an object.
      return typeof value === "string" ? value : JSON.stringify(value);
    },
    async set(key, value, ttlSeconds) {
      await redis.set(key, value, { ex: Math.max(1, ttlSeconds) });
    },
    async setIfAbsent(key, value, ttlSeconds) {
      const result = await redis.set(key, value, { ex: Math.max(1, ttlSeconds), nx: true });
      return result === "OK";
    },
    async del(key) {
      await redis.del(key);
    },
    async incr(key, ttlSeconds) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, Math.max(1, ttlSeconds));
      return count;
    },
    async addMember(key, member) {
      await redis.sadd(key, member);
    },
    async isMember(key, member) {
      return (await redis.sismember(key, member)) === 1;
    },
  };
}

let store: Store | null = null;

/**
 * The backend for this process: Upstash when both credentials are set, otherwise an
 * in-memory map with the same expiries, so tests and local dev need nothing installed.
 */
function backend(): Store {
  if (store) return store;
  // Upstash's own names, or the KV_ names the Vercel Marketplace integration sets.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  store = url && token ? upstashStore(url, token) : memoryStore();
  return store;
}

/** Drops the cached backend and anything the in-memory one held. Tests call it between cases. */
export function resetStore(): void {
  store = null;
  memoryMap().clear();
}

// --- the functions the app uses -------------------------------------------

/** The cached report for a league and gameweek, or null when nothing usable is stored. */
export async function getReport(leagueId: number, gameweek: number): Promise<Report | null> {
  const raw = await backend().get(reportKey(leagueId, gameweek));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as Report;
  } catch {
    return null;
  }
}

/** Saves a finished report. Never called for a failed build. The TTL is capped at three days. */
export async function saveReport(report: Report, ttlSeconds: number): Promise<void> {
  const ttl = Math.min(Math.max(1, Math.floor(ttlSeconds)), REPORT_TTL_SECONDS);
  await backend().set(reportKey(report.leagueId, report.gameweek), JSON.stringify(report), ttl);
}

/** Adds one to a rate counter and returns the new total. The window is set on the first bump. */
export async function bumpCounter(key: string, ttlSeconds: number): Promise<number> {
  return backend().incr(key, ttlSeconds);
}

/** True when this caller now owns the build for a league. False means one is already running. */
export async function takeLock(leagueId: number): Promise<boolean> {
  return backend().setIfAbsent(lockKey(leagueId), "1", LOCK_TTL_SECONDS);
}

/** Releases the build lock. Safe to call when the lock has already expired. */
export async function releaseLock(leagueId: number): Promise<void> {
  await backend().del(lockKey(leagueId));
}

/** Adds an entry to the blocklist. The blocklist never expires. */
export async function blockEntry(entry: number): Promise<void> {
  await backend().addMember(BLOCKLIST_KEY, String(entry));
}

/** True when an entry has opted out; their card renders neutral and never reaches the writer. */
export async function isBlocked(entry: number): Promise<boolean> {
  return backend().isMember(BLOCKLIST_KEY, String(entry));
}
