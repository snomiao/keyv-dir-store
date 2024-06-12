import Keyv from "keyv";
import { KeyvDirStore } from ".";

it("KeyvDirStore works", async () => {
  // store test
  const kv = new Keyv<number | string | { obj: boolean }>({
    store: new KeyvDirStore(".cache/test1"),
    deserialize: KeyvDirStore.deserialize,
    serialize: KeyvDirStore.serialize,
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
    store: new KeyvDirStore(".cache/test1"),
    deserialize: KeyvDirStore.deserialize,
    serialize: KeyvDirStore.serialize,
  });
  expect(await kv2.get("a")).toEqual(undefined); // will delete file before get
  expect(await kv2.get("b")).toEqual(1234);
  expect(await kv2.get("c")).toEqual("b");
  expect(await kv2.get("d")).toEqual({ obj: false });
});
it("KeyvDirStore works with only store", async () => {
  // store test
  const kv = new Keyv<number | string | { obj: boolean }>({
    store: new KeyvDirStore(".cache/test2"),
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
    store: new KeyvDirStore(".cache/test2"),
  });
  expect(await kv2.get("a")).toEqual(undefined); // will delete file before get
  expect(await kv2.get("b")).toEqual(1234);
  expect(await kv2.get("c")).toEqual("b");
  expect(await kv2.get("d")).toEqual({ obj: false });
});
