import SwiftUI

extension Image {
    /// Create an image from a Phosphor SF Symbol bundled in this package.
    ///
    /// Usage:
    /// ```swift
    /// Image.phosphor("heart")
    /// Image.phosphor("heart.fill")
    /// ```
    public static func phosphor(_ name: String) -> Image {
        Image(name, bundle: .module)
    }
}

extension Label where Title == Text, Icon == Image {
    /// Create a label with a Phosphor SF Symbol.
    ///
    /// Usage:
    /// ```swift
    /// Label.phosphor("Favorites", symbol: "heart")
    /// ```
    public static func phosphor(_ title: String, symbol name: String) -> Label {
        Label(title, image: .init(name, bundle: .module))
    }
}
