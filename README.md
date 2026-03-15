# PhosphorSymbols

[Phosphor Icons](https://phosphoricons.com) automatically converted to custom SF Symbol format, distributed as a Swift Package.

Converted from [phosphor-icons/core](https://github.com/phosphor-icons/core) using [SwiftDraw](https://github.com/swhitty/SwiftDraw).

## Install

### Swift Package Manager

Add this repository URL in Xcode → File → Add Package Dependencies:

```
https://github.com/piecelet/PhosphorSymbols.git
```

### Manual

Download from [Releases](../../releases) and drag the `.svg` files into your Xcode Asset Catalog.

## Usage

```swift
import PhosphorSymbols

// SwiftUI
Image(phosphor: .heart)
Image(phosphor: .heart_fill)
Image(phosphor: .heart_duotone)
Label("Favorites", phosphor: .heart)

// UIKit
let image = UIImage(phosphor: .heart)

// AppKit
let image = NSImage(phosphor: .heart)
```

All symbols behave like native SF Symbols — they support dynamic type, weight matching, symbol rendering modes, and tinting.

## Variants

| Directory | Description | Variable Weight |
|-----------|-------------|-----------------|
| `Symbols/outline/` | Outline style | Yes (thin ↔ bold) |
| `Symbols/fill/` | Filled style | No |
| `Symbols/duotone/` | Two-tone style | No |

## Naming Convention

Hyphens and dots in Phosphor icon names are replaced with underscores:

| Phosphor Icon | Swift Property |
|---------------|----------------|
| `arrow-up` | `.arrow_up` |
| `heart` | `.heart` |
| `heart.fill` | `.heart_fill` |
| `heart.duotone` | `.heart_duotone` |

## Local Conversion

```bash
brew install swiftdraw
git clone https://github.com/phosphor-icons/core.git phosphor-core
node Scripts/convert.mjs --phosphor-core phosphor-core
```

## Automation

A GitHub Actions workflow runs weekly to check for Phosphor Icons updates and auto-converts new icons. You can also trigger it manually from the Actions tab.

## License

Phosphor Icons are licensed under the [MIT License](https://github.com/phosphor-icons/core/blob/main/LICENSE).
