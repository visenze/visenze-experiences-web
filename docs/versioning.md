# Versioning

## Versioning Policy

ViSenze widgets follow [semantic versioning](https://semver.org/) and there will only be one version number representing all widgets simultaneously.

Using version number `x.y.z` as example:

- **Patch release** (incrementing `z`, e.g. `1.0.0` to `1.0.1`) may include the following: 
  - Bug fixes / patches.
  - New widget type(s) available under `stable` status.
  - Changes for a11y improvements.
  - Updates to dependencies.
- **Minor release** (incrementing `y`, e.g. `1.0.0` to `1.1.0`) typically includes backward-compatible features or adjustments which, depending on the impact, may also be included under patch release:
  - New features.
  - Removal of features.
  - Look-and-feel adjustments.
- **Major release** (incrementing `x`, e.g. `1.0.0` to `2.0.0`) is reserved for backward-incompatible changes, such as:
  - Drastic change in user flow.
  - Drastic change in look-and-feel.

### Internal implementations

The following internal implementations are covered under versioning policy:

- `wigmix-*` class names.
- All fields under `WidgetClient` and `WidgetConfig` structures, except those marked as `@internal`.

The following internal implementations are not covered under versioning policy and can change anytime:

- `CustomEvent`s with type `wigmix_internal_*`.
- Local storage items with key starting with `wigmix_internal_`.

## Support Status

ViSenze widgets follow this end-of-life (EOL) schedule:

- A patch version (e.g. `1.0.0`) will be EOL immediately after the release of the next patch version (e.g. `1.0.1`).
- A minor version (e.g. `1.0.z`) will be EOL six (6) months after the release of the next minor version (e.g. `1.1.0`). 
  - At the end of the EOL timeline, all users will be automatically upgraded to use the next minor version.
- A major version (e.g. `1.y.z`) will be EOL one (1) year after the release of the next major version (e.g. `2.0.0`).

## Widget Status

Each widget under the `official-widgets` folder may be under different development status.
The status can be seen on top of the `README.md` file of each widget and also on the Discovery Suite console.

- <img src="https://img.shields.io/badge/status-alpha-red">: Widget is still under experimental status, and breaking changes are highly likely and often.
  Alpha widgets cannot be created through Discovery Suite console under normal circumstances.
- <img src="https://img.shields.io/badge/status-beta-yellow">: Widget is more stable than alpha, but breaking changes, while rare, are still possible.
  Beta widgets can be created through Discovery Suite console.
- <img src="https://img.shields.io/badge/status-stable-blue">: Widget is stable and suitable for production usage, and follows the versioning policy.
  - The README and release notes will mention the version number from which the widget has been promoted to `stable` status.
- <img src="https://img.shields.io/badge/status-deprecated-lightgrey">: Widget has been deprecated and will not receive any update anymore.
  - The README and release notes will mention the version number from which the widget has been deprecated.
  - From the point of deprecation, the following can take place at any time:
    - The widget code is removed from this repository.
    - New widget of this type cannot be created anymore through Discovery Suite console.

A new widget can be added at any point of time and may not be mentioned in release notes until it is promoted to `stable`.
