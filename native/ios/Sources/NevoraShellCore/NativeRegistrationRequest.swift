import Foundation

/// Cookie-free fixed-endpoint IO. Mutable delegate/cancellation state is guarded
/// by lock; terminal callbacks always return to the main queue exactly once.
final class NativeRegistrationRequest: NSObject, URLSessionDataDelegate, @unchecked Sendable {
  private let lock = NSLock()
  private let configuration: URLSessionConfiguration
  private let timeout: TimeInterval
  private var deadline: DispatchWorkItem?
  private var session: URLSession?
  private var bytes = Data()
  private var status = 0
  private var completion: ((Int, Data) -> Void)?

  init(configuration: URLSessionConfiguration = .ephemeral, timeout: TimeInterval = 8) {
    precondition(timeout > 0 && timeout <= 8)
    self.timeout = timeout
    self.configuration = configuration.copy() as! URLSessionConfiguration
    super.init()
  }

  func start(_ request: URLRequest, completion: @escaping (Int, Data) -> Void) {
    guard request.url?.scheme == "https", request.httpMethod == "POST",
      !request.httpShouldHandleCookies,
      ["/api/mobile/v1/notifications/challenge", "/api/mobile/v1/notifications/complete"].contains(
        request.url?.path ?? ""),
      request.url?.query == nil, request.url?.fragment == nil, request.url?.user == nil,
      (request.httpBody?.count ?? 0) <= 16384,
      request.value(forHTTPHeaderField: "Cookie") == nil
    else {
      completion(0, Data())
      return
    }
    configuration.httpCookieStorage = nil
    configuration.httpShouldSetCookies = false
    configuration.urlCache = nil
    configuration.urlCredentialStorage = nil
    configuration.timeoutIntervalForRequest = 6
    configuration.timeoutIntervalForResource = 8
    lock.lock()
    guard self.completion == nil, session == nil else {
      lock.unlock()
      completion(0, Data())
      return
    }
    self.completion = completion
    let owned = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    session = owned
    let deadline = DispatchWorkItem { [weak self] in self?.finish(0, Data()) }
    self.deadline = deadline
    lock.unlock()
    DispatchQueue.global().asyncAfter(deadline: .now() + timeout, execute: deadline)
    owned.dataTask(with: request).resume()
  }

  func cancel() { finish(0, Data()) }

  func urlSession(
    _ session: URLSession, task: URLSessionTask,
    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
    completionHandler: @escaping (URLRequest?) -> Void
  ) {
    completionHandler(nil)
    finish(0, Data())
  }

  func urlSession(
    _ session: URLSession, dataTask: URLSessionDataTask,
    didReceive response: URLResponse,
    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void
  ) {
    guard let response = response as? HTTPURLResponse, response.mimeType == "application/json",
      response.expectedContentLength <= 4096
    else {
      completionHandler(.cancel)
      finish(0, Data())
      return
    }
    lock.lock()
    let active = completion != nil
    if active { status = response.statusCode }
    lock.unlock()
    completionHandler(active ? .allow : .cancel)
  }

  func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
    lock.lock()
    guard completion != nil else {
      lock.unlock()
      return
    }
    guard bytes.count + data.count <= 4096 else {
      lock.unlock()
      finish(0, Data())
      return
    }
    bytes.append(data)
    lock.unlock()
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    lock.lock()
    let code = error == nil ? status : 0
    let body = error == nil ? bytes : Data()
    lock.unlock()
    finish(code, body)
  }

  private func finish(_ status: Int, _ body: Data) {
    lock.lock()
    guard let callback = completion else {
      lock.unlock()
      return
    }
    completion = nil
    deadline?.cancel()
    deadline = nil
    let owned = session
    session = nil
    lock.unlock()
    owned?.invalidateAndCancel()
    DispatchQueue.main.async { callback(status, body) }
  }
}
