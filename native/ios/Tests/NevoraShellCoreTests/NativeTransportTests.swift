import XCTest

@testable import NevoraShellCore

private final class ProtocolState: @unchecked Sendable {
  private let lock = NSLock()
  private var handler: ((FakeRegistrationProtocol) -> Void)?
  var receive: ((FakeRegistrationProtocol) -> Void)? {
    get {
      lock.lock()
      defer { lock.unlock() }
      return handler
    }
    set {
      lock.lock()
      handler = newValue
      lock.unlock()
    }
  }
}
private final class FakeRegistrationProtocol: URLProtocol, @unchecked Sendable {
  private static let state = ProtocolState()
  static var receive: ((FakeRegistrationProtocol) -> Void)? {
    get { state.receive }
    set { state.receive = newValue }
  }
  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() { Self.receive?(self) }
  override func stopLoading() {}
  func respond(_ status: Int = 200, parts: [Data]) {
    client?.urlProtocol(
      self,
      didReceive: HTTPURLResponse(
        url: request.url!, statusCode: status, httpVersion: "HTTP/1.1",
        headerFields: ["Content-Type": "application/json"])!, cacheStoragePolicy: .notAllowed)
    for part in parts { client?.urlProtocol(self, didLoad: part) }
    client?.urlProtocolDidFinishLoading(self)
  }
}
final class NativeTransportTests: XCTestCase {
  override func tearDown() {
    FakeRegistrationProtocol.receive = nil
    super.tearDown()
  }
  private func transport() -> NativeRegistrationRequest {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [FakeRegistrationProtocol.self]
    return NativeRegistrationRequest(configuration: config)
  }
  private func request() -> URLRequest {
    var r = URLRequest(
      url: URL(string: "https://nevora.example/api/mobile/v1/notifications/complete")!)
    r.httpMethod = "POST"
    r.httpShouldHandleCookies = false
    r.httpBody = Data("{}".utf8)
    return r
  }
  func testActualTransportKeepsCookiesOutAndReturnsExactlyOnce() {
    let done = expectation(description: "terminal")
    done.assertForOverFulfill = true
    FakeRegistrationProtocol.receive = { fake in
      XCTAssertEqual(
        fake.request.url?.absoluteString,
        "https://nevora.example/api/mobile/v1/notifications/complete")
      XCTAssertNil(fake.request.value(forHTTPHeaderField: "Cookie"))
      XCTAssertNil(fake.request.value(forHTTPHeaderField: "Authorization"))
      fake.respond(parts: [Data("{\"state\":\"unavailable\"}".utf8)])
    }
    let owned = transport()
    owned.start(request()) { status, body in
      XCTAssertEqual(status, 200)
      XCTAssertFalse(body.isEmpty)
      done.fulfill()
    }
    wait(for: [done], timeout: 2)
  }
  func testStreamedOversizeAndCancellationTerminateWithoutLateSuccess() {
    let large = expectation(description: "oversize")
    large.assertForOverFulfill = true
    FakeRegistrationProtocol.receive = {
      $0.respond(parts: [Data(repeating: 65, count: 2050), Data(repeating: 66, count: 2050)])
    }
    let first = transport()
    first.start(request()) { status, body in
      XCTAssertEqual(status, 0)
      XCTAssertTrue(body.isEmpty)
      large.fulfill()
    }
    wait(for: [large], timeout: 2)
    let started = expectation(description: "started")
    let cancelled = expectation(description: "cancelled")
    cancelled.assertForOverFulfill = true
    FakeRegistrationProtocol.receive = { _ in started.fulfill() }
    let second = transport()
    second.start(request()) { status, body in
      XCTAssertEqual(status, 0)
      XCTAssertTrue(body.isEmpty)
      cancelled.fulfill()
    }
    wait(for: [started], timeout: 2)
    second.cancel()
    wait(for: [cancelled], timeout: 2)
  }
  func testRedirectCannotReachForeignEndpoint() {
    let done = expectation(description: "redirect refused")
    var requests = 0
    FakeRegistrationProtocol.receive = { fake in
      requests += 1
      XCTAssertEqual(fake.request.url?.host, "nevora.example")
      let response = HTTPURLResponse(
        url: fake.request.url!, statusCode: 302, httpVersion: "HTTP/1.1",
        headerFields: ["Location": "https://foreign.example/"])!
      fake.client?.urlProtocol(
        fake, wasRedirectedTo: URLRequest(url: URL(string: "https://foreign.example/")!),
        redirectResponse: response)
      fake.client?.urlProtocolDidFinishLoading(fake)
    }
    let owned = transport()
    owned.start(request()) { status, _ in
      XCTAssertEqual(status, 0)
      done.fulfill()
    }
    wait(for: [done], timeout: 2)
    XCTAssertEqual(requests, 1)
  }
  func testActualTotalDeadlineTerminatesStalledIO() {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [FakeRegistrationProtocol.self]
    let done = expectation(description: "bounded stalled IO")
    done.assertForOverFulfill = true
    FakeRegistrationProtocol.receive = { _ in }
    let owned = NativeRegistrationRequest(configuration: config, timeout: 0.05)
    owned.start(request()) { status, body in
      XCTAssertEqual(status, 0)
      XCTAssertTrue(body.isEmpty)
      done.fulfill()
    }
    wait(for: [done], timeout: 1)
  }
  func testInvalidEndpointAndCookieBearingRequestNeverStartsIO() {
    FakeRegistrationProtocol.receive = { _ in XCTFail("Unexpected native IO") }
    let done = expectation(description: "refused")
    done.expectedFulfillmentCount = 2
    var r = request()
    r.setValue("fictional=private", forHTTPHeaderField: "Cookie")
    transport().start(r) { status, _ in
      XCTAssertEqual(status, 0)
      done.fulfill()
    }
    r = request()
    r.url = URL(string: "https://nevora.example/api/arbitrary")!
    transport().start(r) { status, _ in
      XCTAssertEqual(status, 0)
      done.fulfill()
    }
    wait(for: [done], timeout: 1)
  }
}
