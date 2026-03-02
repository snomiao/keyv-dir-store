import { existsSync } from "fs";
import Keyv from "keyv";
import { KeyvDirStore } from ".";
import { KeyvDirStoreAsJSON } from "./KeyvDirStoreAsJSON";

it("KeyvDirStore works", async () => {
  // store test
  const kv = new Keyv<number | string | { obj: boolean }>({
    store: new KeyvDirStore(".cache/test1", { filename: (x) => x, suffix: ".json", mtimeAsTTL: true }),
    namespace: "",
    ...KeyvDirStoreAsJSON,
  });
  await kv.clear();
  await kv.set("a", 1234, -86400e3); // already expired

  expect(existsSync(".cache/test1/a.json")).toEqual(true);
  expect(await kv.get("a")).toEqual(undefined); // will delete file before get
  expect(existsSync(".cache/test1/a.json")).toEqual(false);

  expect(existsSync(".cache/test1/b.json")).toEqual(false);
  await kv.set("b", 1234); // never expired
  expect(existsSync(".cache/test1/b.json")).toEqual(true);
  expect(await kv.get("b")).toEqual(1234);

  await kv.set("c", "b", 86400e3); // 1 day
  expect(await kv.get("c")).toEqual("b");
  await kv.set("d", { obj: false }, 86400e3); // obj store
  expect(await kv.get("d")).toEqual({ obj: false });

  // new instance with no cache Obj, to test file cache
  const kv2 = new Keyv<number | string | { obj: boolean }>({
    store: new KeyvDirStore(".cache/test1", { filename: (x) => x, suffix: ".json", mtimeAsTTL: true }),
    namespace: "",
    ...KeyvDirStoreAsJSON,
  });
  expect(await kv2.get("a")).toEqual(undefined); // will delete file before get
  expect(await kv2.get("b")).toEqual(1234);
  expect(await kv2.get("c")).toEqual("b");
  expect(await kv2.get("d")).toEqual({ obj: false });
});
it("KeyvDirStore works without deserialize", async () => {
  // store test
  const kv = new Keyv<number | string | { obj: boolean }>({
    store: new KeyvDirStore(".cache/test2", { filename: (x) => x }),
    namespace: "",
  });
  await kv.clear();
  await kv.set("a", 1234, -86400e3); // already expired
  expect(await kv.get("a")).toEqual(undefined); // will delete file before get
  await kv.set("b", 1234); // never expired
  expect(await kv.get("b")).toEqual(1234);
  await kv.set("c", "b", 86400e3); // 1 day
  expect(await kv.get("c")).toEqual("b");
  await kv.set("d", { obj: false }, 86400e3); // obj store
  expect(await kv.get("d")).toEqual({ obj: false });

  // new instance with no cache Obj, to test file cache
  const kv2 = new Keyv<number | string | { obj: boolean }>({
    store: new KeyvDirStore(".cache/test2", { filename: (x) => x }),
    namespace: "",
  });
  expect(await kv2.get("a")).toEqual(undefined); // will delete file before get
  expect(await kv2.get("b")).toEqual(1234);
  expect(await kv2.get("c")).toEqual("b");
  expect(await kv2.get("d")).toEqual({ obj: false });
});
