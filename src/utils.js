import {load, JSON_SCHEMA} from 'js-yaml';
import * as core from '@actions/core';

export function parseParameters(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  let doc;
  try {
    doc = load(trimmed, {schema: JSON_SCHEMA});
  } catch (error) {
    throw new Error(`Failed to parse parameters as YAML: ${error.message}`);
  }

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('parameters must be a YAML mapping (key: value pairs)');
  }

  return Object.entries(doc)
    .filter(([name]) => name)
    .map(([name, value]) => {
      // String() would store a mapping as "[object Object]" and a sequence as "a,b"
      if (value !== null && typeof value === 'object') {
        throw new Error(
          `parameters.${name} must be a scalar, got ${Array.isArray(value) ? 'sequence' : 'mapping'}`
        );
      }

      // YAML parses 1.10 as a number, which stringifies back as "1.1"
      if (typeof value === 'number' || typeof value === 'boolean') {
        core.warning(`parameters.${name} is an unquoted ${typeof value}; quote it to preserve the literal`);
      }

      return {
        name: String(name),
        value: value == null ? '' : String(value),
      };
    });
}
