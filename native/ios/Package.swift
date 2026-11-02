// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NevoraShellCore",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [.library(name: "NevoraShellCore", targets: ["NevoraShellCore"])],
    targets: [
        .target(name: "NevoraShellCore"),
        .testTarget(name: "NevoraShellCoreTests", dependencies: ["NevoraShellCore"])
    ]
)
