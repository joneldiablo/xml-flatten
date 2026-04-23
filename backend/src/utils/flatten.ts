export type FlatCopyOptions = {
  delimiter?: string;
  ommit?: string[];
  ommitArrays?: boolean;
  prefix?: string;
};

const ESCAPE_CHAR = '\\:';
const UNESCAPE_CHAR = ':';

function escapeKey(key: string | undefined): string | undefined {
  if (!key) return key;
  if (key.includes(ESCAPE_CHAR)) return key.replace(ESCAPE_CHAR, UNESCAPE_CHAR);
  return key.includes(':') ? key.replace(':', ESCAPE_CHAR) : key;
}

function unescapeKey(key: string): string {
  return key.replace(ESCAPE_CHAR, UNESCAPE_CHAR);
}

export function flatten(
  object: object,
  options: FlatCopyOptions = {}
): Record<string, unknown> {
  if (options.delimiter === undefined) options.delimiter = '.';
  if (options.ommit === undefined) options.ommit = [];
  if (options.ommitArrays === undefined) options.ommitArrays = false;

  const newObject: Record<string, unknown> = {};
  if (typeof object !== 'object' || object === null)
    throw new Error('Must be object');

  const recursive = (
    element: unknown,
    key: string | undefined,
    index?: string
  ): void => {
    const escapedKey = escapeKey(key);
    const newIndex = index ? [index, escapedKey].join(options.delimiter) : escapedKey;

    if (typeof element === 'object' && element !== null) {
      if (Array.isArray(element)) {
        if (options.ommitArrays) {
          newObject[newIndex!] = element;
        } else {
          element.forEach((e, i) => recursive(e, i.toString(), newIndex));
        }
      } else {
        if (key && options.ommit?.includes(unescapeKey(key))) {
          newObject[newIndex!] = element;
        } else {
          Object.entries(element as Record<string, unknown>).forEach(([i, e]) =>
            recursive(e, i, newIndex)
          );
        }
      }
    } else {
      newObject[newIndex!] = element;
    }
  };

  recursive(object, options.prefix);
  return newObject;
}

export function unflatten(
  object: Record<string, unknown>,
  delimiter: string = '.'
): Record<string, unknown> {
  if (typeof object !== 'object' || object === null)
    throw new Error('Input must be an object');

  const result: Record<string, unknown> = {};

  const isInteger = (key: string): boolean => /^\d+$/.test(key);

  for (const flatKey of Object.keys(object)) {
    const value = object[flatKey];
    const keys = flatKey.split(delimiter);
    let current: unknown = result;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const nextKey = keys[i + 1];
      const isLast = i === keys.length - 1;
      const keyIsIndex = isInteger(key);
      const nextIsIndex = nextKey ? isInteger(nextKey) : false;

      const realKey = keyIsIndex ? parseInt(key, 10) : key;

      if (isLast) {
        (current as Record<string, unknown>)[realKey] = value;
      } else {
        if ((current as Record<string, unknown>)[realKey] === undefined) {
          (current as Record<string, unknown>)[realKey] = nextIsIndex ? [] : {};
        }

        current = (current as Record<string, unknown>)[realKey];
      }
    }
  }

  return result;
}

export interface SerializeEntry {
  path: string;
  value: string;
  type: string;
  document_uuid: string;
}

export const serialize = async (
  data: Record<string, unknown>,
  opts: { groupKey?: string } = {}
): Promise<SerializeEntry[]> => {
  const groupKey = opts.groupKey || 'document_uuid';
  const flat = flatten(data, { delimiter: '/' });
  
  return Object.entries(flat).map(([path, value]) => ({
    path: path.replace(/\\:/g, ':'),
    value: String(value),
    type: typeof value,
    [groupKey]: '',
  }));
};