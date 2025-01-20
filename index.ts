import type { DeserializedData, default as Keyv } from "keyv";
import md5 from "md5";
import { mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "path";
import sanitizeFilename from "sanitize-filename";

type CacheMap<Value> = Map<string, DeserializedData<Value>>;
/**
 * KeyvDirStore is a Keyv.Store<string> implementation that stores data in files.
 *
 * learn more [README](./README.md)
 *
 * @example
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
 */
export class KeyvDirStore<Value extends string> implements Keyv.Store<string> {
  #dir: string;
  #cache: CacheMap<Value>;
  #ready: Promise<unknown>;
  #filename: (key: string) => string;
  ext = ".json";
  constructor(
    /** dir to cache store
     * WARN: dont share this dir with other purpose
     *       it will be rm -f when keyv.clear() is called
     */
    dir: string,
    {
      cache = new Map(),
      filename,
      ext,
    }: {
      cache?: CacheMap<Value>;
      filename?: (key: string) => string;
      ext?: string;
    } = {}
  ) {
    this.#ready = mkdir(dir, { recursive: true }).catch(() => {});
    this.#cache = cache;
    this.#dir = dir;
    this.#filename = filename ?? this.#defaultFilename;
    this.ext = ext ?? this.ext;
  }
  #defaultFilename(key: string) {
    // use dir as hash salt to avoid collisions
    const readableName = sanitizeFilename(key).slice(0, 16);
    const hashName = md5(key + "+SALT-poS1djRa4M2jXsWi").slice(0, 16);
    const name = `${readableName}-${hashName}`;
    return name;
  }
  #path(key: string) {
    return path.join(
      this.#dir,
      sanitizeFilename(this.#filename(key) + this.ext)
    );
  }
  async get(key: string) {
    // read memory
    const memCached = this.#cache.get(key);
    if (memCached) {
      // console.log("memory cache hit but expired", key, cached.expires, Date.now());
      if (memCached.expires && memCached.expires < Date.now()) {
        await this.delete(key);
      } else {
        return memCached.value;
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
    return await readFile(path, "utf8").catch(() => undefined);
  }
  async set(key: string, value: Value, ttl?: number) {
    if (!value) return await this.delete(key);
    // const { value, expires } = JSON.parse(stored) as DeserializedData<Value>;
    const expires = ttl ? Date.now() + ttl : 0;
    // save to memory
    this.#cache.set(key, { value, expires });
    // save to file
    await this.#ready;
    // console.log({ key, value, expires });
    await mkdir(this.#dir, { recursive: true }).catch(() => {});
    await writeFile(this.#path(key), value); // create a expired file
    await utimes(this.#path(key), new Date(), new Date(expires ?? 0)); // set expires time as mtime (0 as never expired)
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
}
