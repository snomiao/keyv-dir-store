import { mkdir, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import type { DeserializedData, default as Keyv } from "keyv";
import md5 from "md5";
import path from "path";
import sanitizeFilename from "sanitize-filename";
type Value = any;
type CacheMap<Value> = Map<string, DeserializedData<Value>>;
/**
 * KeyvDirStore is a Keyv.Store<string> implementation that stores data in files.
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
 */
export class KeyvDirStore implements Keyv.Store<string> {
  #dir: string;
  #cache: CacheMap<Value>;
  #ready: Promise<unknown>;
  #path: (key: string) => string;
  ext = ".json";
  constructor(
    dir: string,
    {
      cache = new Map(),
      path,
      ext,
    }: {
      cache?: CacheMap<Value>;
      path?: (key: string) => string;
      ext?: string;
    } = {}
  ) {
    this.#ready = mkdir(dir, { recursive: true });
    this.#cache = cache;
    this.#dir = dir;
    this.#path = path ?? this.#defaultPath;
    this.ext = ext ?? this.ext;
  }
  #defaultPath(key: string) {
    // use dir as hash salt to avoid collisions
    const readableName = sanitizeFilename(key).slice(4, 16);
    const hashName = md5(this.#dir + key).slice(0, 16);
    const name = readableName + "-" + hashName + this.ext;
    return path.join(this.#dir, name);
  }
  async get(key: string) {
    // read memory
    const cached = this.#cache.get(key);
    if (cached) {
      // console.log("memory cache hit but expired", key, cached.expires, Date.now());
      if (cached.expires && cached.expires < Date.now()) {
        await this.delete(key);
      } else {
        return cached.value;
      }
    }
    // read file cache
    const stats = await stat(this.#path(key)).catch(() => null);
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
    // return this.#parse(await readFile(this.#path(key), "utf8"));
    return await readFile(this.#path(key), "utf8").catch(() => undefined);
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
    await writeFile(this.#path(key), value); // create a expired file
    await utimes(this.#path(key), +new Date(), new Date(expires ?? 0)); // set a future expires time (0 as never expired)
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
    await mkdir(this.#dir, { recursive: true });
  }
  async has(key: string) {
    return undefined !== (await this.get(key));
  }

  // Save expires into mtime, and value into file
  static serialize({ value }: DeserializedData<Value>): string {
    return JSON.stringify(value, null, 2);
  }
  static deserialize(str: string): DeserializedData<Value> {
    return { value: JSON.parse(str), expires: undefined };
  }
}
