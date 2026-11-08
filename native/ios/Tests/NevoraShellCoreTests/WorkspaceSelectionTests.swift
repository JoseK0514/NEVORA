import Foundation
import XCTest
@testable import NevoraShellCore
final class WorkspaceSelectionTests: XCTestCase {
 func testAcceptsOnlyTheExactDiscoveredBusinessAndKeepsNavigationInsideIt() throws {
  let data=Data(#"{"schemaVersion":1,"status":"ready","origin":"https://alpha.portal.example.invalid"}"#.utf8)
  let policy=try WorkspaceSelection.decode(statusCode:200,data:data,portalBaseDomain:"portal.example.invalid",expectedSlug:"alpha")
  XCTAssertTrue(policy.contains(URL(string:"https://alpha.portal.example.invalid/app")!))
  XCTAssertFalse(policy.contains(URL(string:"https://beta.portal.example.invalid/app")!))
  XCTAssertThrowsError(try WorkspaceSelection.decode(statusCode:200,data:data,portalBaseDomain:"portal.example.invalid",expectedSlug:"beta"))
 }
 func testRejectsForeignPoisonedAndUnavailableDiscovery() throws {
  for origin in ["https://foreign.invalid","https://alpha.portal.example.invalid/path","https://alpha.portal.example.invalid@foreign.invalid","http://alpha.portal.example.invalid","https://alpha.portal.example.invalid:444"] {
   let data=try JSONSerialization.data(withJSONObject:["schemaVersion":1,"status":"ready","origin":origin])
   XCTAssertThrowsError(try WorkspaceSelection.decode(statusCode:200,data:data,portalBaseDomain:"portal.example.invalid",expectedSlug:"alpha"))
  }
  let data=Data(#"{"schemaVersion":1,"status":"ready","origin":"https://alpha.portal.example.invalid","role":"OWNER"}"#.utf8)
  XCTAssertThrowsError(try WorkspaceSelection.decode(statusCode:200,data:data,portalBaseDomain:"portal.example.invalid",expectedSlug:"alpha"))
  XCTAssertThrowsError(try WorkspaceSelection.decode(statusCode:503,data:data,portalBaseDomain:"portal.example.invalid",expectedSlug:"alpha"))
 }
}
