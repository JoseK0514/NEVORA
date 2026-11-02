import UIKit
import WebKit
import SafariServices

final class PortalViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private let store = WKWebsiteDataStore.default()
    private var policy: BackendPolicy?
    private var lifecycle = ShellLifecycle()
    private var webView: WKWebView?
    private var probe: SessionProbe?
    private var pendingNavigation: WKNavigation?
    private var loadTicket: Int?
    private var deadline: DispatchWorkItem?
    private let cover = UIStackView()
    private let label = UILabel()
    private let retry = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 247/255, green: 246/255, blue: 243/255, alpha: 1)
        cover.axis = .vertical
        cover.alignment = .center
        cover.spacing = 20
        cover.translatesAutoresizingMaskIntoConstraints = false
        label.font = .preferredFont(forTextStyle: .headline)
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 0
        label.textAlignment = .center
        retry.setTitle("Try again", for: .normal)
        retry.titleLabel?.font = .preferredFont(forTextStyle: .body)
        retry.titleLabel?.adjustsFontForContentSizeCategory = true
        retry.addTarget(self, action: #selector(retryConnection), for: .touchUpInside)
        cover.addArrangedSubview(label)
        cover.addArrangedSubview(retry)
        view.addSubview(cover)
        NSLayoutConstraint.activate([
            cover.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor),
            cover.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            cover.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            retry.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)
        ])
        var origin = Bundle.main.object(forInfoDictionaryKey: "NEVORABackendOrigin") as? String ?? ""
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if let index = arguments.firstIndex(of: "-nevora-debug-origin"), arguments.indices.contains(index + 1) {
            origin = arguments[index + 1]
        }
        policy = try? BackendPolicy(origin: origin, mode: .debug)
        #else
        policy = try? BackendPolicy(origin: origin, mode: .release)
        #endif
        showCover(policy == nil ? "NEVORA is not configured" : "Connecting to NEVORA", canRetry: false)
    }

    func suspend() {
        lifecycle.suspend()
        probe?.cancel()
        probe = nil
        pendingNavigation = nil
        loadTicket = nil
        deadline?.cancel()
        webView?.stopLoading()
        showCover("NEVORA", canRetry: false)
    }

    func activate() {
        loadViewIfNeeded()
        guard let policy else { return }
        let ticket = lifecycle.activate()
        probe?.cancel()
        deadline?.cancel()
        pendingNavigation = nil
        showCover("Connecting to NEVORA", canRetry: false)
        webView?.removeFromSuperview()
        webView = nil
        let probe = SessionProbe()
        self.probe = probe
        probe.start(policy: policy) { [weak self] result in
            guard let self, self.lifecycle.accepts(ticket) else { return }
            self.probe = nil
            switch result {
            // This probe proves reachability/protocol only. A fresh protected
            // navigation lets WebKit use its own cookie store and the server
            // validate the current session, including a redirect to login.
            case .success: self.load(policy.url(path: "/app"), ticket: ticket)
            case .failure: self.showCover("Can't connect to NEVORA", canRetry: true)
            }
        }
    }

    @objc private func retryConnection() { activate() }

    private func load(_ url: URL, ticket: Int) {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = store
        // Versioned presentation context; never a credential or role claim.
        configuration.applicationNameForUserAgent = "NEVORA-Native/iOS/1"
        // No script handlers or injected scripts: browser authority stays in WebKit.
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isHidden = true
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.insertSubview(webView, belowSubview: cover)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        self.webView = webView
        loadTicket = ticket
        pendingNavigation = webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15))
        let deadline = DispatchWorkItem { [weak self] in
            guard let self, self.lifecycle.accepts(ticket), self.pendingNavigation != nil else { return }
            self.pendingNavigation = nil
            self.webView?.stopLoading()
            self.showCover("Can't connect to NEVORA", canRetry: true)
        }
        self.deadline = deadline
        DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: deadline)
    }

    private func showCover(_ message: String, canRetry: Bool) {
        webView?.isHidden = true
        cover.isHidden = false
        label.text = message
        retry.isHidden = !canRetry
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard webView === self.webView, let ticket = loadTicket, lifecycle.accepts(ticket),
              navigation === pendingNavigation, let url = webView.url, policy?.contains(url) == true else { return }
        pendingNavigation = nil
        deadline?.cancel()
        cover.isHidden = true
        webView.isHidden = false
        // A fresh foreground browser must acquire native focus before shared
        // private readers can observe document.hasFocus().
        webView.becomeFirstResponder()
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-nevora-debug-focus-report") {
            let observe = { [weak self, weak webView] in
                guard let self, let webView, webView === self.webView, self.lifecycle.accepts(ticket) else { return }
                // Fixed, read-only test diagnostic. No bridge or page-provided code.
                webView.evaluateJavaScript("({focus:document.hasFocus(),visible:document.visibilityState==='visible',online:navigator.onLine})") { value, _ in
                    guard let state = value as? [String: Bool] else { return }
                    NSLog("NEVORA_NATIVE_FOCUS window=%d first=%d focus=%d visible=%d online=%d",
                          webView.window?.isKeyWindow == true ? 1 : 0, webView.isFirstResponder ? 1 : 0,
                          state["focus"] == true ? 1 : 0, state["visible"] == true ? 1 : 0, state["online"] == true ? 1 : 0)
                }
            }
            observe()
            DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: observe)
        }
        #endif
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(webView, error: error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(webView, error: error) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { failed(webView, error: URLError(.networkConnectionLost)) }

    private func failed(_ webView: WKWebView, error: Error) {
        guard webView === self.webView, let ticket = loadTicket, lifecycle.accepts(ticket),
              (error as NSError).code != NSURLErrorCancelled else { return }
        pendingNavigation = nil
        deadline?.cancel()
        showCover("Can't connect to NEVORA", canRetry: true)
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard webView === self.webView, let policy, let url = action.request.url else { decisionHandler(.cancel); return }
        let disposition = policy.navigation(to: url, method: action.request.httpMethod ?? "GET",
                                            userInitiated: action.navigationType == .linkActivated,
                                            mainFrame: action.targetFrame?.isMainFrame ?? true)
        switch disposition {
        case .internalPage: decisionHandler(.allow)
        case .external:
            decisionHandler(.cancel)
            present(SFSafariViewController(url: url), animated: true)
        case .deny: decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        guard let url = response.response.url, policy?.contains(url) == true,
              response.canShowMIMEType, (response.response as? HTTPURLResponse)?.statusCode ?? 500 < 500 else {
            decisionHandler(.cancel)
            failed(webView, error: URLError(.badServerResponse))
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if action.targetFrame == nil, let url = action.request.url, policy?.contains(url) == true { webView.load(action.request) }
        return nil
    }
}
