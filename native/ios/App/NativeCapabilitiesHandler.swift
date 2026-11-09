import Foundation
import UIKit
import UserNotifications
import WebKit

enum NativeAPNsMaterial {
  static let material = NativeTokenState()
  static var changed: (() -> Void)?
}

/// A narrow, main-frame origin/page/lifecycle channel. Native completion replies
/// contain sanitized state and opaque generation only; never provider tokens,
/// private keys, cookies, profiles, or server diagnostics.
final class NativeCapabilitiesHandler: NSObject, WKScriptMessageHandlerWithReply {
  private let policy: BackendPolicy
  private let gate: NativeCapabilityGate
  private weak var view: WKWebView?
  private var request: NativeRegistrationRequest?
  private var rotation: NativeRegistrationRequest?
  private var key: NativeKeyStore?
  private let enabled: Bool
  private let environment: String
  private let appId: String
  private let origin: String
  private let metadataKey: String
  init(policy: BackendPolicy) {
    self.policy = policy
    gate = NativeCapabilityGate(policy: policy)
    let parts = URLComponents(url: policy.origin, resolvingAgainstBaseURL: false)!
    origin =
      (parts.scheme ?? "") + "://" + (parts.host ?? "")
      + (parts.port.map { $0 == 443 ? "" : ":\($0)" } ?? "")
    appId = Bundle.main.bundleIdentifier ?? ""
    environment =
      Bundle.main.object(forInfoDictionaryKey: "NEVORANativePushEnvironment") as? String ?? ""
    enabled =
      Bundle.main.object(forInfoDictionaryKey: "NEVORANativePushEnabled") as? String == "true"
      && ["test", "production"].contains(environment) && policy.origin.scheme == "https"
    metadataKey = "nevora.native.generation." + origin + "." + environment + "." + appId
  }
  func bind(_ view: WKWebView) {
    suspend()
    self.view = view
  }
  func ready(_ url: URL) { _ = gate.begin(url) }
  func suspend() {
    gate.suspend()
    request?.cancel()
    request = nil
  }
  private func receipt() -> NativeReceipt? {
    if let value = UserDefaults.standard.dictionary(forKey: metadataKey),
      let revision = value["revision"] as? String, let active = value["active"] as? Bool
    {
      return NativeReceipt(revision: revision, active: active)
    }
    if let old = UserDefaults.standard.string(forKey: metadataKey) {
      return NativeReceipt(revision: old, active: false)
    }
    return nil
  }
  private func remember(_ value: [String: String]) -> Bool {
    guard let state = value["state"], ["active", "complete"].contains(state),
      let revision = value["generation"],
      let next = NativeReceipt(revision: revision, active: state == "active")
    else { return false }
    UserDefaults.standard.set(
      ["revision": next.revision, "active": next.active], forKey: metadataKey)
    return true
  }
  func acceptsTap(_ generation: String) -> Bool { enabled && receipt()?.generation == generation }
  private func keyStore() throws -> NativeKeyStore {
    if let key { return key }
    let created = try NativeKeyStore(scope: origin + "|" + environment + "|" + appId)
    key = created
    return created
  }
  private func scope(_ key: NativeKeyStore) -> NativeEnrollmentScope {
    NativeEnrollmentScope(
      origin: origin, environment: environment, platform: "ios", appId: appId,
      provider: environment == "test" ? "apns-sandbox" : "apns-production",
      keyFingerprint: key.fingerprint)
  }
  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
    replyHandler: @escaping (Any?, String?) -> Void
  ) {
    let source = message.frameInfo.securityOrigin
    var parts = URLComponents()
    parts.scheme = source.protocol
    parts.host = source.host
    if source.port > 0 { parts.port = source.port }
    guard message.webView === view, let url = parts.url, let raw = message.body as? String,
      let command = gate.accept(
        Data(raw.utf8), source: url, mainFrame: message.frameInfo.isMainFrame),
      let ticket = gate.nonce
    else {
      replyHandler(nil, "Native request unavailable")
      return
    }
    let answer: ([String: Any]) -> Void = { [weak self] value in
      guard let self, self.gate.nonce == ticket, message.webView === self.view else {
        replyHandler(nil, "Native document changed")
        return
      }
      replyHandler(value.merging(["version": 1, "id": command.id], uniquingKeysWith: { $1 }), nil)
    }
    guard enabled else {
      answer([
        "state": "unavailable", "nonce": ticket, "platform": "ios", "permission": "unsupported",
      ])
      return
    }
    do {
      let key = try keyStore()
      switch command.method {
      case "hello":
        UNUserNotificationCenter.current().getNotificationSettings { settings in
          DispatchQueue.main.async {
            let permission =
              settings.authorizationStatus == .authorized
                || settings.authorizationStatus == .provisional
              ? "granted" : settings.authorizationStatus == .denied ? "denied" : "default"
            answer([
              "state": "ready", "nonce": ticket, "platform": "ios",
              "spki": key.spki.base64EncodedString().replacingOccurrences(of: "+", with: "-")
                .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: ""),
              "keyFingerprint": key.fingerprint, "permission": permission,
              "generation": self.receipt()?.generation as Any? ?? NSNull(),
              "revision": self.receipt()?.revision as Any? ?? NSNull(),
              "maintenance": self.rotation != nil,
            ])
          }
        }
      case "notifications.permission":
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) {
          granted, _ in
          DispatchQueue.main.async {
            // Permission UI may have retired this document. Registration
            // must start again with a fresh authenticated challenge.
            if granted { UIApplication.shared.registerForRemoteNotifications() }
            answer(["state": "permission", "permission": granted ? "granted" : "denied"])
          }
        }
      case "notifications.complete":
        guard request == nil, rotation == nil, let token = NativeAPNsMaterial.material.token,
          let c = (try JSONSerialization.jsonObject(with: Data(command.payload.utf8)))
            as? [String: Any], c["operation"] as? String == "enroll"
        else { throw NativeRegistrationError.invalid }
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
          DispatchQueue.main.async {
            guard let self, self.gate.nonce == ticket, self.request == nil else { return }
            guard
              settings.authorizationStatus == .authorized
                || settings.authorizationStatus == .provisional
            else {
              answer(["state": "denied"])
              return
            }
            do {
              let outgoing = try NativeCompletion.request(
                c, token: token, scope: self.scope(key), now: Date(), sign: key.sign)
              let owned = NativeRegistrationRequest()
              self.request = owned
              owned.start(outgoing) { [weak self, weak owned] code, data in
                guard let self, self.request === owned else { return }
                self.request = nil
                let result = NativeCompletion.reply(data, status: code)
                if result["state"] == "active" {
                  guard self.remember(result) else {
                    answer(["state": "unavailable"])
                    return
                  }
                  NativeAPNsMaterial.material.acknowledge(token)
                }
                answer(result)
                if result["state"] == "active" { self.rotateTokenIfEnrolled() }
              }
            } catch { answer(["state": "unavailable"]) }
          }
        }
      case "notifications.detach":
        maintenance("detach", key: key, reviewed: command.payload, answer: answer)
      default: answer(["state": "unavailable"])
      }
    } catch { answer(["state": "unavailable"]) }
  }
  private func activeRequest(_ rotating: Bool) -> NativeRegistrationRequest? {
    rotating ? rotation : request
  }
  private func assign(_ owned: NativeRegistrationRequest?, rotating: Bool) {
    if rotating { rotation = owned } else { request = owned }
  }
  private func maintenance(
    _ operation: String, key: NativeKeyStore, reviewed: String? = nil, rotating: Bool = false,
    answer: @escaping ([String: Any]) -> Void
  ) {
    guard activeRequest(rotating) == nil, !rotating || request == nil,
      let expected = reviewed ?? receipt()?.revision,
      let url = URL(string: origin + "/api/mobile/v1/notifications/challenge")
    else {
      answer(["state": "unavailable"])
      return
    }
    let sentToken = operation == "detach" ? nil : NativeAPNsMaterial.material.token
    var outgoing = URLRequest(
      url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
    outgoing.httpMethod = "POST"
    outgoing.httpShouldHandleCookies = false
    outgoing.setValue("application/json", forHTTPHeaderField: "Content-Type")
    outgoing.httpBody = try? JSONSerialization.data(withJSONObject: [
      "operation": operation, "keyFingerprint": key.fingerprint, "expectedGeneration": expected,
      "operationId": UUID().uuidString.lowercased(),
    ])
    let owned = NativeRegistrationRequest()
    assign(owned, rotating: rotating)
    owned.start(outgoing) { [weak self, weak owned] code, data in
      guard let self, self.activeRequest(rotating) === owned else { return }
      self.assign(nil, rotating: rotating)
      do {
        guard code == 200,
          let body = (try JSONSerialization.jsonObject(with: data)) as? [String: Any],
          Set(body.keys) == Set(["state", "challenge"]), body["state"] as? String == "challenge",
          let challenge = body["challenge"] as? [String: Any],
          challenge["operation"] as? String == operation,
          challenge["expectedGeneration"] as? String == expected
        else { throw NativeRegistrationError.invalid }
        if rotating {
          guard self.receipt()?.acceptsRotation(expected: expected) == true else { return }
          if sentToken != NativeAPNsMaterial.material.token {
            self.rotateTokenIfEnrolled()
            return
          }
        }
        let signed = try NativeCompletion.request(
          challenge, token: sentToken, scope: self.scope(key), now: Date(), sign: key.sign)
        let completion = NativeRegistrationRequest()
        self.assign(completion, rotating: rotating)
        completion.start(signed) { [weak self, weak completion] code, data in
          guard let self, self.activeRequest(rotating) === completion else { return }
          self.assign(nil, rotating: rotating)
          if rotating && self.receipt()?.acceptsRotation(expected: expected) != true { return }
          let result = NativeCompletion.reply(data, status: code)
          if ["active", "complete"].contains(result["state"] ?? "") {
            guard self.remember(result) else {
              answer(["state": "unavailable"])
              return
            }
            if result["state"] == "active", let sentToken {
              NativeAPNsMaterial.material.acknowledge(sentToken)
            }
          }
          answer(result)
          if result["state"] == "active" { self.rotateTokenIfEnrolled() }
        }
      } catch { answer(["state": "unavailable"]) }
    }
  }
  func rotateTokenIfEnrolled() {
    guard enabled, request == nil, rotation == nil, receipt()?.canRotate == true,
      NativeAPNsMaterial.material.pending, NativeAPNsMaterial.material.token != nil,
      let key = try? keyStore()
    else { return }
    // Native-only rotation is installation/revision bound, independent of the
    // web document. The server rechecks its existing account/session authority;
    // a newer native receipt wins and cannot be overwritten by this callback.
    maintenance("rotate", key: key, rotating: true, answer: { _ in })
  }
  func refreshRegistrationIfAllowed() {
    guard enabled else { return }
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      guard
        settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
      else { return }
      DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
    }
  }
}
