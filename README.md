
# KeyvDIR

Store key into a file per value

## Store each value with CSV

```ts
new Keyv({
  store: new KeyvDirStore("cache/kv", { ext: "csv" }),
  serialize: ({ value }) => csvFormat(value),
  deserialize: (str) => ({ value: csvParse(str), expires: undefined }),
});
```

## Store each value with YAML

```ts
new Keyv({
  store: new KeyvDirStore("cache/kv", { ext: "yaml" }),
  serialize: ({ value }) => yaml.stringify(value),
  deserialize: (str) => ({ value: yaml.parse(str), expires: undefined }),
});
```
