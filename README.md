# Keyv Directory Store

High performance Filesystem Keyv Store, caches each key-value pair into a $key.json. and more! *.JSON, *.YAML, *.CSV is also avaliable.

## Usages

```ts
// Default: Store each value with JSON in format "{value: ..., expires: ...}"
new Keyv({
  store: new KeyvDirStore(".cache/kv")
});

// Store each object list with CSV
new Keyv({
  store: new KeyvDirStore(".cache/kv", { ext: ".csv" }),
  serialize: ({ value }) => d3.csvFormat(value),
  deserialize: (str) => ({ value: d3.csvParse(str), expires: undefined }),
});

// Store each object list with TSV
new Keyv({
  store: new KeyvDirStore(".cache/kv", { ext: ".tsv" }),
  serialize: ({ value }) => d3.tsvFormat(value),
  deserialize: (str) => ({ value: d3.tsvParse(str), expires: undefined }),
});

// Store each value with YAML
new Keyv({
  store: new KeyvDirStore(".cache/kv", { ext: ".json" }),
  serialize: ({ value }) => yaml.stringify(value),
  deserialize: (str) => ({ value: yaml.parse(str), expires: undefined }),
});

// Store each value with JSON
new Keyv({
  store: new KeyvDirStore(".cache/kv", { ext: ".json" }),
  serialize: ({ value }) => JSON.stringify(value, null, 2),
  deserialize: (str) => ({ value: JSON.parse(str), expires: undefined }),
});

```