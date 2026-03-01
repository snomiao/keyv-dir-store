import type { DeserializedData, KeyvStoreAdapter } from "keyv";
import md5 from "md5";
import { mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "path";
import sanitizeFilename from "sanitize-filename";

type CacheMap<Value> = Map<string, DeserializedData<Value>>;
/**
 * KeyvDirStore is a Keyv.Store<string> implementation that stores data in files.
 *
 * **Warning**: TTL is stored in file mtime, which may be modified by other programs
 * (backup tools, sync services, etc.). For reliable TTL, wrap this store with Keyv:
 * `new Keyv({ store: new KeyvDirStore(...) })` - Keyv stores expiry in the value itself.
 *
 * learn more [README](./README.md)
 *
 * @example Basic usage
 * const kv = new Keyv<number | string | { obj: boolean }>({
 *   store: new KeyvDirStore("cache/test"),
 *   deserialize: KeyvDirStore.deserialize,
 *   serialize: KeyvDirStore.serialize,
 * });
 * await kv.set("a", 1234, -86400e3); // already expired
 * expect(await kv.get("a")).toEqual(undefined); // will delete file before get
 * await kv.set("b", 1234); // never expired
 * expect(await kv.get("b")).toEqual(1234);
 *
 * @example Mirror KeyvGithub paths (for use with keyv-nest)
 * // Use same prefix/suffix as KeyvGithub, with filename: (k) => k for raw paths
 * const dirStore = new KeyvDirStore("./cache", {
 *   prefix: "data/",
 *   suffix: ".json",
 *   filename: (k) => k,  // use key as-is, no hashing
 * });
 * // Now dirStore uses same paths as KeyvGithub:
 * // key "foo" -> ./cache/data/foo.json (local) and data/foo.json (GitHub)
 *
 */
export class KeyvDirStore<Value extends string> implements KeyvStoreAdapter {
  #dir: string;
  #cache: CacheMap<Value>;
  #ready: Promise<unknown>;
  #filename: (key: string) => string;
  opts: Record<string, unknown> = {};
  namespace?: string;
  /** Path prefix prepended to every key (e.g. 'data/'). Defaults to ''. */
  readonly prefix: string;
  /** Path suffix appended to every key (e.g. '.json'). Defaults to '.json'. */
  readonly suffix: string;
  constructor(
    /** dir to cache store
     * WARN: dont share this dir with other purpose
     *       it will be rm -f when keyv.clear() is called
     */
    dir: string,
    {
      cache = new Map(),
      filename,
      prefix,
      suffix,
    }: {
      cache?: CacheMap<Value>;
      filename?: (key: string) => string;
      /** Path prefix prepended to every key (e.g. 'data/'). Use with filename: (k) => k for raw paths. */
      prefix?: string;
      /** Path suffix appended to every key (e.g. '.json'). Defaults to '.json'. Use with filename: (k) => k for raw paths. */
      suffix?: string;
    } = {},
  ) {
    this.#ready = mkdir(dir, { recursive: true }).catch(() => {});
    this.#cache = cache;
    this.#dir = dir;
    this.#filename = filename ?? this.#defaultFilename;
    this.prefix = prefix ?? "";
    this.suffix = suffix ?? ".json";
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
  async get<T = Value>(key: string): Promise<T | undefined> {
    // read memory
    const memCached = this.#cache.get(key);
    if (memCached) {
      // console.log("memory cache hit but expired", key, cached.expires, Date.now());
      if (memCached.expires && memCached.expires < Date.now()) {
        await this.delete(key);
      } else {
        return memCached.value as T;
      }
    }
    // read file cache
    const path = this.#path(key);
    const stats = await stat(path).catch(() => null);
    if (!stats) return undefined; // stat not found
    const expires = +stats.mtime;
    if (expires !== 0) {
      const expired = +stats.mtime < +Date.now();
      if (expired) {
        //   console.log("file cache hit expired", key, expires, Date.now(), expired);
        await this.delete(key);
        return undefined;
      }
    }
    return await readFile(path, "utf8").catch(() => undefined) as T | undefined;
  }
  async set(key: string, value: Value, ttl?: number) {
    if (!value) return await this.delete(key);
    // const { value, expires } = JSON.parse(stored) as DeserializedData<Value>;
    const expires = ttl ? Date.now() + ttl : 0;
    // save to memory
    this.#cache.set(key, { value, expires });
    // save to file
    await this.#ready;
    const filePath = this.#path(key);
    // create parent directories for nested paths (e.g. data/sub/key.json)
    await mkdir(path.dirname(filePath), { recursive: true }).catch(() => {});
    await writeFile(filePath, value); // create a expired file
    await utimes(filePath, new Date(), new Date(expires ?? 0)); // set expires time as mtime (0 as never expired)
    return true;
  }
  async delete(key: string) {
    // delete memory
    this.#cache.delete(key);
    await rm(this.#path(key), { force: true });
    return true;
  }
  async clear() {
    await rm(this.#dir, { recursive: true }).catch(() => void 0);
  }
  async has(key: string) {
    return undefined !== (await this.get(key));
  }
  // Save expires into mtime, and value into file
  /** @deprecated use KeyvDirStoreJSON */
  static serialize({ value }: DeserializedData<any>): string {
    return JSON.stringify(value, null, 2);
  }
  /** @deprecated use KeyvDirStoreJSON */
  static deserialize(str: string): DeserializedData<any> {
    return { value: JSON.parse(str), expires: undefined };
  }
  // IEventEmitter implementation (required by KeyvStoreAdapter)
  on(_event: string, _listener: (...args: any[]) => void): this {
    return this;
  }
}
