# Keyv Directory Store

High performance Filesystem Keyv Store, caches each key-value pair into a $key.json. and more! _.JSON, _.YAML, \*.CSV is also avaliable.

[![npm version](https://badge.fury.io/js/keyv-dir-store.svg)](https://www.npmjs.com/package/keyv-dir-store)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This package provides a filesystem-based storage adapter for [Keyv](https://github.com/jaredwray/keyv), storing each key-value pair in individual files with support for various formats.

## Features

- ✅ Persistent storage using the filesystem
- ✅ Individual files per key-value pair
- ✅ Support customize serialize/deserialize, you can store your data into JSON, YAML, CSV, and TSV formats
- ✅ TTL (Time-To-Live) support using file modification times
- ✅ In-memory caching for improved performance
- ✅ Full compatibility with Keyv API
- ✅ Customizable file naming and extensions

## Installation

```bash
# Using npm
npm install keyv keyv-dir-store

# Using yarn
yarn add keyv keyv-dir-store

# Using pnpm
pnpm add keyv keyv-dir-store

# Using bun
bun add keyv keyv-dir-store
```

## Usage Examples

### Basic Usage

```ts
import Keyv from "keyv";
import { KeyvDirStore } from "keyv-dir-store";

// Default: Store each value with JSON
const keyv = new Keyv({
  store: new KeyvDirStore(".cache/kv"),
});

// Set a value (never expires)
await keyv.set("key1", "value1");

// Set a value with TTL (expires after 1 day)
await keyv.set("key2", "value2", 86400000);

// Get a value
const value = await keyv.get("key1");

// Check if a key exists
const exists = await keyv.has("key1");

// Delete a key
await keyv.delete("key1");

// Clear all keys
await keyv.clear();
```

### Format-Specific Examples

#### Store with JSON (using provided helper)

```ts
import Keyv from "keyv";
import { KeyvDirStore } from "keyv-dir-store";
import { KeyvDirStoreAsJSON } from "keyv-dir-store/KeyvDirStoreAsJSON";

const keyv = new Keyv({
  store: new KeyvDirStore(".cache/kv", { ext: ".json" }),
  ...KeyvDirStoreAsJSON,
});
```

#### Store with YAML (using provided helper)

```ts
import Keyv from "keyv";
import { KeyvDirStore } from "keyv-dir-store";
import { KeyvDirStoreAsYaml } from "keyv-dir-store/KeyvDirStoreAsYaml";

const keyv = new Keyv({
  store: new KeyvDirStore(".cache/kv", { ext: ".yaml" }),
  ...KeyvDirStoreAsYaml,
});
```

#### Store Object Lists with CSV

```ts
import Keyv from "keyv";
import { KeyvDirStore } from "keyv-dir-store";
import * as d3 from "d3";

const keyv = new Keyv({
  store: new KeyvDirStore(".cache/kv", { ext: ".csv" }),
  serialize: ({ value }) => d3.csvFormat(value),
  deserialize: (str) => ({ value: d3.csvParse(str), expires: undefined }),
});
```

#### Store Object Lists with TSV

```ts
import Keyv from "keyv";
import { KeyvDirStore } from "keyv-dir-store";
import * as d3 from "d3";

const keyv = new Keyv({
  store: new KeyvDirStore(".cache/kv", { ext: ".tsv" }),
  serialize: ({ value }) => d3.tsvFormat(value),
  deserialize: (str) => ({ value: d3.tsvParse(str), expires: undefined }),
});
```

## API Reference

### `new KeyvDirStore(directory, options?)`

Creates a new KeyvDirStore instance.

#### Parameters

- `directory` (string): The directory path where files will be stored
- `options` (object, optional):
  - `cache` (Map, optional): Custom cache Map to use
  - `filename` (function, optional): Custom filename generator function
  - `ext` (string, optional): File extension to use (default: `.json`)
  - `prefix` (string, optional): Path prefix prepended to every key (e.g. `'data/'`)
  - `suffix` (string, optional): Path suffix appended to every key (overrides `ext` when set)

#### Example with Custom Options

```ts
import Keyv from "keyv";
import { KeyvDirStore } from "keyv-dir-store";

const keyv = new Keyv({
  store: new KeyvDirStore(".cache/kv", {
    // Custom file extension
    ext: ".data",

    // Custom filename generator
    filename: (key) => `custom-prefix-${key}`,
  }),
});
```

#### Mirror KeyvGithub paths (for use with keyv-nest)

Use the same prefix/suffix as KeyvGithub with `filename: (k) => k` for raw paths:

```ts
import KeyvNest from "keyv-nest";
import { KeyvDirStore } from "keyv-dir-store";
import KeyvGithub from "keyv-github";

const prefix = "data/";
const suffix = ".json";

const store = KeyvNest(
  new KeyvDirStore("./cache", {
    prefix,
    suffix,
    filename: (k) => k,  // use key as-is, no hashing
  }),
  new KeyvGithub("owner/repo", { client, prefix, suffix })
);

// key "foo" -> ./cache/data/foo.json (local) and data/foo.json (GitHub)
```

## How It Works

1. Each key-value pair is stored in a separate file on disk
2. The key is used to generate a filename (with sanitization)
3. The value is serialized using the specified format
4. TTL information is stored in the file's modification time
5. An in-memory cache is used to improve performance

## See Also

Other Keyv storage adapters by the same author:

- [keyv-github](https://github.com/snomiao/keyv-github) — GitHub repository adapter; each key is a file, commits are writes
- [keyv-sqlite](https://github.com/snomiao/keyv-sqlite) — SQLite storage adapter
- [keyv-mongodb-store](https://github.com/snomiao/keyv-mongodb-store) — MongoDB storage adapter
- [keyv-nedb-store](https://github.com/snomiao/keyv-nedb-store) — NeDB embedded file-based adapter
- [keyv-cache-proxy](https://github.com/snomiao/keyv-cache-proxy) — transparent caching proxy that wraps any object
- [keyv-nest](https://github.com/snomiao/keyv-nest) — hierarchical multi-layer caching adapter

## License

MIT © [snomiao](https://github.com/snomiao)

## Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check [issues page](https://github.com/snomiao/keyv-dir-store/issues).

## Acknowledgements

This package is built on top of the excellent [Keyv](https://github.com/jaredwray/keyv) library.
