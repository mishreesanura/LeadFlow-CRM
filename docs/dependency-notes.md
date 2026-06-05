# Dependency Notes

## Next.js and PostCSS audit advisory

`npm audit --omit=dev` currently reports a moderate PostCSS advisory through Next.js because the latest checked `next` package metadata still declares `postcss@8.4.31`.

Attempted mitigation:

- Checked latest Next.js package metadata with `npm view next version`.
- Checked `npm view next@latest dependencies.postcss`.
- Tested an npm override to force `postcss@8.5.15`.

Outcome:

- The override makes npm mark the dependency tree invalid because Next declares an exact PostCSS version.
- `npm audit fix --force` suggests downgrading Next to `9.3.3`, which is not an acceptable fix for a modern Next.js app.

Decision:

- Keep the valid Next.js dependency graph.
- Document the advisory and monitor Next.js for a release that updates its PostCSS dependency.
