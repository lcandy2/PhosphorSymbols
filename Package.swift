// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PhosphorSymbols",
    platforms: [
        .iOS(.v14),
        .macOS(.v11),
        .watchOS(.v7),
        .tvOS(.v14),
        .visionOS(.v1)
    ],
    products: [
        .library(
            name: "PhosphorSymbols",
            targets: ["PhosphorSymbols"]
        )
    ],
    targets: [
        .target(
            name: "PhosphorSymbols",
            resources: [
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "PhosphorSymbolsTests",
            dependencies: ["PhosphorSymbols"]
        )
    ]
)
