# AIONEXT Monitor Controller [VERSION]

> **Release draft:** Replace every bracketed value, verify the compatibility table against completed tests, and remove any item that is not present in the tagged build before publishing.

**Every display. One control room.** This release brings a clearer way to discover displays, work with controls reported by your hardware, and reuse local presets and calibration profiles.

## Highlights
- Brand-aware monitor identification for clearer display organization. Brand recognition does not guarantee feature support.
- Capability-aware presets and calibration/profile workflows, limited to controls the connected hardware reports as supported.
- Improved compatibility visibility and clearer platform-specific behavior.

## Improvements and fixes
- [Add verified user-facing changes from this release.]
- [Add fixes with affected platform or monitor family where known.]

## Compatibility and testing
| Platform / architecture | Tested on this release | Verified behavior / limitations |
|---|---|---|
| Windows [version / architecture] | [Yes/No] | [WMI discovery / built-in brightness result] |
| macOS [version / architecture] | [Yes/No] | [Discovery result; current backend has no writable DDC/CI controls] |
| Linux [distribution / architecture] | [Yes/No] | [ddcutil version, DDC/CI test, I²C permission notes] |

Monitor feature availability depends on model, firmware, connection path, and OS. See the [platform support notes](https://github.com/AIONEXT/monitor-controller#platform-support).

## Downloads
Asset names below must exactly match the files attached to this release:
- **Windows:** [filename]
- **macOS:** [filename]
- **Linux:** [filename]

## Checksums
- SHA-256 `[filename]`: `[checksum]`

## Upgrade notes
[Document any migration or restart steps. If none, confirm and write “No special steps required.”]

## Known limitations
- [List known release-specific issues and workarounds.]
- Do not infer support from brand identification; use controls shown as available by the application.

## Signing and provenance
[State code signing/notarization only after verifying the published artifact and certificate chain.]

---

**Independent software notice:** AIONEXT Monitor Controller is not affiliated with or endorsed by display manufacturers. Brand names identify devices only; they do not guarantee compatibility.
