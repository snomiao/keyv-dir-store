import type { KeyvStoreAdapter } from "keyv";
import md5 from "md5";
import { mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "path";
import sanitizeFilename from "sanitize-filename";
/**
 * KeyvDirStore is a Keyv.Store<string> implementation that stores data in files.
 *
 * **Note**: This store has no in-memory cache. Use keyv-nest to add a memory cache layer:
 * `KeyvNest(new Map(), new KeyvDirStore(...))`
 *
 * **Warning**: TTL is stored in file mtime, which may be modified by other programs
 * (backup tools, sync services, etc.). For reliable TTL, wrap this store with Keyv:
 * `new Keyv({ store: new KeyvDirStore(...) })` - Keyv stores expiry in the value itself.
 *
 * learn more [README](./README.md)
 *
 * @example Basic usage (string values only)
 * const store = new KeyvDirStore("cache/test");
 * await store.set("key", "string value");
 * const value = await store.get("key"); // "string value"
 *
 * @example With Keyv for object serialization
 * const kv = new Keyv({ store: new KeyvDirStore("cache/test") });
 * await kv.set("a", { obj: true }); // Keyv handles serialization
 * await kv.get("a"); // { obj: true }
 *
 * @example With memory cache using keyv-nest
 * const store = KeyvNest(new Map(), new KeyvDirStore("cache/test"));
 *
 */
export class KeyvDirStore implements KeyvStoreAdapter {
  #dir: string;
  #filename: (key: string) => string;
  opts: Record<string, unknown> = {};
  namespace?: string;
  /** Path prefix prepended to every key (e.g. 'data/'). Defaults to ''. */
  readonly prefix: string;
  /** Path suffix appended to every key (e.g. '.json'). Defaults to ''. */
  readonly suffix: string;
  /** Use file mtime as TTL. Defaults to false (unreliable, use Keyv wrapper instead). */
  readonly mtimeAsTTL: boolean;
  constructor(
    /** dir to store files
     * WARN: dont share this dir with other purpose
     *       it will be rm -rf when keyv.clear() is called
     */
    dir: string,
    {
      filename,
      prefix,
      suffix,
      mtimeAsTTL,
    }: {
      filename?: (key: string) => string;
      /** Path prefix prepended to every key (e.g. 'data/'). Defaults to ''. */
      prefix?: string;
      /** Path suffix appended to every key (e.g. '.json'). Defaults to ''. */
      suffix?: string;
      /** Use file mtime as TTL. Defaults to false (unreliable, use Keyv wrapper instead). */
      mtimeAsTTL?: boolean;
    } = {},
  ) {
    this.#dir = dir;
    this.#filename = filename ?? this.#defaultFilename;
    this.prefix = prefix ?? "";
    this.suffix = suffix ?? "";
    this.mtimeAsTTL = mtimeAsTTL ?? false;
  }
  #defaultFilename(key: string) {
    // use dir as hash salt to avoid collisions
    const readableName = sanitizeFilename(key).slice(0, 16);
    const hashName = md5(key + "+SALT-poS1djRa4M2jXsWi").slice(0, 16);
    const name = `${readableName}-${hashName}`;
    return name;
  }
  #path(key: string) {
    const filename = this.#filename(key);
    // Sanitize filename+suffix for safety; prefix can have slashes for nested paths
    const safeFilename = sanitizeFilename(filename + this.suffix);
    const relativePath = this.prefix + safeFilename;
    return path.join(this.#dir, relativePath);
  }
  async get<T = string>(key: string): Promise<T | undefined> {
    const filePath = this.#path(key);
    const stats = await stat(filePath).catch(() => null);
    if (!stats) return undefined;
    // check TTL via mtime if enabled (0 = never expires)
    if (this.mtimeAsTTL) {
      const expires = +stats.mtime;
      if (expires !== 0 && expires < Date.now()) {
        await this.delete(key);
        return undefined;
      }
    }
    return await readFile(filePath, "utf8").catch(() => undefined) as T | undefined;
  }
  async set(key: string, value: string, ttl?: number) {
    if (typeof value !== "string") {
      throw new TypeError(
        "KeyvDirStore only accepts string values. Wrap with new Keyv() for object serialization."
      );
    }
    if (!value) return await this.delete(key);
    const filePath = this.#path(key);
    // create parent directories for nested paths (e.g. data/sub/key.json)
    await mkdir(path.dirname(filePath), { recursive: true }).catch(() => {});
    await writeFile(filePath, value);
    // set TTL via mtime if enabled (0 = never expires)
    if (this.mtimeAsTTL) {
      const expires = ttl ? Date.now() + ttl : 0;
      await utimes(filePath, new Date(), new Date(expires)).catch(() => {});
    }
    return true;
  }
  async delete(key: string) {
    await rm(this.#path(key), { force: true });
    return true;
  }
  async clear() {
    await rm(this.#dir, { recursive: true }).catch(() => void 0);
  }
  async has(key: string) {
    return undefined !== (await this.get(key));
  }
  // IEventEmitter implementation (required by KeyvStoreAdapter)
  on(_event: string, _listener: (...args: any[]) => void): this {
    return this;
  }
}
