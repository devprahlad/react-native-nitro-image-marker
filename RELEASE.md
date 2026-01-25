# Release Guide (NPM)

This package is published manually to npm. Use the steps below.

## 1) Generate bindings + build

```bash
npm run codegen
```

## 2) Sanity check

```bash
npm run build
```

## 3) Bump version

```bash
npm version patch
# or: npm version minor / npm version major
```

## 4) Publish

```bash
npm publish
```

## Notes

- Ensure you are logged in: `npm login`
- The `files` field in `package.json` controls what is shipped.
- Do not edit `nitrogen/generated` manually; regenerate via `npm run codegen`.
