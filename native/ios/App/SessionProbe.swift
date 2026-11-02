import Foundation

/// One bounded request. It never uses the shared cookie jar, follows redirects,
/// persists a response, or returns cookies/diagnostics to the web page.
final class SessionProbe: NSObject, URLSessionDataDelegate {
    private var session: URLSession?
    private var buffer = Data()
    private var statusCode: Int?
    private var completion: ((Result<SessionStatus, Error>) -> Void)?

    func start(policy: BackendPolicy, completion: @escaping (Result<SessionStatus, Error>) -> Void) {
        self.completion = completion
        let request = policy.compatibilityRequest()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCache = nil
        configuration.timeoutIntervalForRequest = 6
        configuration.timeoutIntervalForResource = 8
        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        self.session = session
        session.dataTask(with: request).resume()
    }

    func cancel() { finish(.failure(URLError(.cancelled))) }

    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let response = response as? HTTPURLResponse,
              response.mimeType == "application/json", response.expectedContentLength <= 4096 else {
            completionHandler(.cancel)
            finish(.failure(SessionStatus.ReadError.unavailable))
            return
        }
        statusCode = response.statusCode
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard buffer.count + data.count <= 4096 else {
            finish(.failure(SessionStatus.ReadError.unavailable))
            return
        }
        buffer.append(data)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error { finish(.failure(error)); return }
        do { finish(.success(try SessionStatus.decode(statusCode: statusCode ?? 0, data: buffer))) }
        catch { finish(.failure(error)) }
    }

    private func finish(_ result: Result<SessionStatus, Error>) {
        // Delegate callbacks and cancellation may race; serialize completion ownership.
        DispatchQueue.main.async { [self] in
            guard let completion else { return }
            self.completion = nil
            session?.invalidateAndCancel()
            session = nil
            completion(result)
        }
    }
}
