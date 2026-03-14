# Phosphor SF Symbols

[Phosphor Icons](https://phosphoricons.com) automatically converted to custom SF Symbol format, distributed as a Swift Package.

Converted from [phosphor-icons/core](https://github.com/phosphor-icons/core) using [SwiftDraw](https://github.com/swhitty/SwiftDraw).

## Install

### Swift Package Manager

Add this repository URL in Xcode → File → Add Package Dependencies:

```
https://github.com/piecelet/phosphor-sf-symbols.git
```

### Manual

Download from [Releases](../../releases) and drag the `.svg` files into your Xcode Asset Catalog.

## Usage

```swift
import PhosphorSymbols

// Type-safe accessors
Image.phosphor(Phosphor.heart)
Image.phosphor(Phosphor.heartFill)

// String-based
Image.phosphor("heart")

// Labels
Label.phosphor("Favorites", symbol: "heart")
```

All symbols behave like native SF Symbols — they support dynamic type, weight matching, symbol rendering modes, and tinting.

## Variants

| Directory | Description | Variable Weight |
|-----------|-------------|-----------------|
| `Symbols/outline/` | Outline style | Yes (thin ↔ bold) |
| `Symbols/fill/` | Filled style | No |

## Local Conversion

```bash
brew install swiftdraw
git clone https://github.com/phosphor-icons/core.git phosphor-core
./Scripts/convert.sh phosphor-core Symbols
```

## Automation

A GitHub Actions workflow runs weekly to check for Phosphor Icons updates and auto-converts new icons. You can also trigger it manually from the Actions tab.

## License

Phosphor Icons are licensed under the [MIT License](https://github.com/phosphor-icons/core/blob/main/LICENSE).
