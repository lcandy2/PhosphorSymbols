import SwiftUI

extension Image {
    /// Creates an image from a Phosphor SF Symbol.
    ///
    /// ```swift
    /// Image(phosphor: .heart)
    /// Image(phosphor: .heart_fill)
    /// ```
    public init(phosphor symbol: PhosphorSymbol) {
        self.init(symbol.rawValue, bundle: .module)
    }
}

extension Label where Title == Text, Icon == Image {
    /// Creates a label with a Phosphor SF Symbol.
    ///
    /// ```swift
    /// Label("Favorites", phosphor: .heart)
    /// ```
    public init(_ title: some StringProtocol, phosphor symbol: PhosphorSymbol) {
        self.init(title, image: .init(symbol.rawValue, bundle: .module))
    }
}

#if canImport(UIKit)
import UIKit

extension UIImage {
    /// Creates an image from a Phosphor SF Symbol.
    ///
    /// ```swift
    /// let image = UIImage(phosphor: .heart)
    /// ```
    public convenience init?(phosphor symbol: PhosphorSymbol) {
        self.init(named: symbol.rawValue, in: .module, compatibleWith: nil)
    }
}
#endif

#if canImport(AppKit) && !targetEnvironment(macCatalyst)
import AppKit

extension NSImage {
    /// Creates an image from a Phosphor SF Symbol.
    ///
    /// ```swift
    /// let image = NSImage(phosphor: .heart)
    /// ```
    public convenience init?(phosphor symbol: PhosphorSymbol) {
        let name = NSImage.Name(symbol.rawValue)
        guard Bundle.module.image(forResource: name) != nil else { return nil }
        self.init(named: name)
    }
}
#endif
