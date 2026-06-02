import yaml from 'js-yaml';

export function parseParameters(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  let doc;
  try {
    doc = yaml.load(trimmed, {schema: yaml.JSON_SCHEMA});
  } catch (error) {
    throw new Error(`Failed to parse parameters as YAML: ${error.message}`);
  }

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('parameters must be a YAML mapping (key: value pairs)');
  }

  return Object.entries(doc)
    .filter(([name]) => name)
    .map(([name, value]) => ({
      name: String(name),
      value: value == null ? '' : String(value),
    }));
}
