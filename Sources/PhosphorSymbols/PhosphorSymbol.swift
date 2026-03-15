import Foundation

/// A type-safe representation of a Phosphor icon as a custom SF Symbol.
///
/// All hyphens (`-`) and dots (`.`) in icon names are replaced with underscores (`_`).
/// For example:
/// - `PhosphorSymbol.arrow_up` → identifier `"arrow-up"`
/// - `PhosphorSymbol.heart_fill` → identifier `"heart.fill"`
///
/// Usage:
///
/// ```swift
/// // SwiftUI
/// Image(phosphor: .heart)
/// Label("Favorites", phosphor: .heart)
///
/// // UIKit
/// let image = UIImage(phosphor: .heart)
/// ```
public struct PhosphorSymbol: RawRepresentable, Hashable, Sendable {
    /// The raw identifier of the Phosphor symbol, matching the asset catalog name.
    public var rawValue: String

    public init(rawValue: String) {
        self.rawValue = rawValue
    }

    internal init(identifier: String) {
        self.rawValue = identifier
    }
}
