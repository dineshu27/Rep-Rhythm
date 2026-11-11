// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "FitAiSyncCore", platforms: [.iOS(.v17), .macOS(.v13)], products: [.library(name: "FitAiSyncCore", targets: ["FitAiSyncCore"])], targets: [.target(name: "FitAiSyncCore"), .executableTarget(name: "FitAiSyncChecks", dependencies: ["FitAiSyncCore"], path: "Checks"), .testTarget(name: "FitAiSyncCoreTests", dependencies: ["FitAiSyncCore"])], swiftLanguageModes: [.v5])
