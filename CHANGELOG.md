# Changelog

## v4.0.0

- **Breaking:** a `parameters` value that is a mapping or a sequence fails the run instead of being stored as
  `[object Object]` or `a,b`
- Unquoted number and boolean values now log a warning; quote them to preserve the literal

## v3.0.0

- **Breaking:** `parameters` is a YAML mapping (`key: value`) now, not comma-separated `key=value` pairs
