import UIKit
import Capacitor
import WebKit

#if !DEBUG
#error("NEVORA's feasibility shell is Debug-only. Complete the native release review before creating a store build.")
#endif

/// Experiments stay in the shell; the hosted application's typography is unchanged.
final class NevoraBridgeViewController: CAPBridgeViewController {
    private let scriptMarker = "// NEVORA_FIXTURE_DYNAMIC_TYPE\n"

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        // Localhost experiment only. The packaged fixture keeps Capacitor's
        // custom-scheme behavior. A real HTTPS associated domain remains owed.
        configuration.limitsNavigationsToAppBoundDomains =
            instanceConfiguration.serverURL.scheme == "http" &&
            instanceConfiguration.serverURL.host == "localhost"
        configuration.userContentController.addUserScript(textScaleScript())
        return configuration
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // History swipe can bypass route-owned sheet dismissal. Keep disabled
        // until the explicit native Back/sheet matrix has been verified.
        webView?.allowsBackForwardNavigationGestures = false
        NotificationCenter.default.addObserver(self, selector: #selector(updateTextScale),
            name: UIContentSizeCategory.didChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(updateTextScale),
            name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    private func textScaleScript() -> WKUserScript {
        // Default body size is 17pt. Preserve the fixture's default 16px rem
        // while following the full Dynamic Type category without an artificial cap.
        let rootSize = UIFont.preferredFont(forTextStyle: .body).pointSize / 17.0 * 16.0
        let source = scriptMarker + """
        (() => {
          if (location.protocol !== 'capacitor:' || location.hostname !== 'localhost') return;
          document.documentElement.style.fontSize = '\(rootSize)px';
          document.documentElement.dataset.nativeTextScale = 'ios-dynamic-type';
        })();
        """
        return WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
    }

    @objc private func updateTextScale() {
        guard let webView = webView else { return }
        let controller = webView.configuration.userContentController
        let retained = controller.userScripts.filter { !$0.source.hasPrefix(scriptMarker) }
        controller.removeAllUserScripts()
        retained.forEach { controller.addUserScript($0) }
        let updated = textScaleScript()
        controller.addUserScript(updated)
        webView.evaluateJavaScript(updated.source, completionHandler: nil)
    }

    deinit { NotificationCenter.default.removeObserver(self) }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = NevoraBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
