import type { DeserializedData } from "keyv";
import yaml from "yaml";

export const KeyvDirStoreAsYaml = {
  serialize({ value }: DeserializedData<any>): string {
    return yaml.stringify(value);
  },
  deserialize(str: string): DeserializedData<any> {
    return { value: yaml.parse(str), expires: undefined };
  },
};
