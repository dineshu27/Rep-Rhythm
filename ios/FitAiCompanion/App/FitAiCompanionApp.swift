import SwiftUI
import UIKit
@MainActor final class AppDelegate:NSObject,UIApplicationDelegate {
    func application(_ application:UIApplication,didFinishLaunchingWithOptions launchOptions:[UIApplication.LaunchOptionsKey:Any]?=nil)->Bool {HealthSyncController.shared.launch();return true}
}
@main struct FitAiCompanionApp:App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    var body:some Scene {WindowGroup{ContentView(model:HealthSyncController.shared)}}
}
