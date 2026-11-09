import UIKit
import UserNotifications

@main
final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey:Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate=self;return true
    }
    func application(_ application: UIApplication,didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NativeAPNsMaterial.material.update(deviceToken.map{String(format:"%02x",$0)}.joined());if NativeAPNsMaterial.material.pending {NativeAPNsMaterial.changed?()}
    }
    func application(_ application: UIApplication,didFailToRegisterForRemoteNotificationsWithError error: Error) {/* Keep a previously known native token on a transient registration failure. */}
    func userNotificationCenter(_ center: UNUserNotificationCenter,didReceive response: UNNotificationResponse,withCompletionHandler completionHandler: @escaping ()->Void) {
        let info=response.notification.request.content.userInfo
        DispatchQueue.main.async {
            for scene in UIApplication.shared.connectedScenes.compactMap({$0 as? UIWindowScene}) {
                for window in scene.windows {(window.rootViewController as? PortalViewController)?.receiveNotification(info)}
            }
            completionHandler()
        }
    }
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: session.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var controller: PortalViewController?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let controller = PortalViewController()
        let window = UIWindow(windowScene: scene)
        window.rootViewController = controller
        self.controller = controller
        self.window = window
        window.makeKeyAndVisible()
        if let url=options.userActivities.first?.webpageURL {controller.receiveLink(url)}
        if let response=options.notificationResponse {controller.receiveNotification(response.notification.request.content.userInfo)}
    }
    func scene(_ scene: UIScene,continue userActivity: NSUserActivity) {if userActivity.activityType==NSUserActivityTypeBrowsingWeb,let url=userActivity.webpageURL {controller?.receiveLink(url)}}
    func sceneWillResignActive(_ scene: UIScene) { controller?.suspend() }
    func sceneDidBecomeActive(_ scene: UIScene) { controller?.activate() }
}
