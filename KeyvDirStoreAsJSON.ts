import type { DeserializedData } from "keyv";

export const KeyvDirStoreAsJSON = {
  serialize({ value }: DeserializedData<any>): string {
    return JSON.stringify(value, null, 2);
  },
  deserialize(str: string): DeserializedData<any> {
    return { value: JSON.parse(str), expires: undefined };
  },
};
