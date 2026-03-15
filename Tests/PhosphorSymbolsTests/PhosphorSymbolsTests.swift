import Testing
import SwiftUI
@testable import PhosphorSymbols

@Test func symbolRawValue() {
    let symbol = PhosphorSymbol(rawValue: "heart")
    #expect(symbol.rawValue == "heart")
}

@Test func staticProperties() {
    #expect(PhosphorSymbol.heart.rawValue == "heart")
    #expect(PhosphorSymbol.heart_fill.rawValue == "heart.fill")
    #expect(PhosphorSymbol.arrow_up.rawValue == "arrow-up")
}

@Test func imageInit() {
    let image = Image(phosphor: .heart)
    _ = image // compiles
}
