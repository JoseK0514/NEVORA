import CryptoKit
import Foundation
import Security

/// Installation identity only. No browser cookie or business-session key is
/// read here. Release keys require the device Secure Enclave; the simulator's
/// software key is confined to Debug development execution.
final class NativeKeyStore {
  private let key: SecKey
  let spki: Data
  let fingerprint: String
  init(scope: String) throws {
    let tag = Data(
      ("com.nevora.native.v1."
        + SHA256.hash(data: Data(scope.utf8)).map { String(format: "%02x", $0) }.joined()).utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: tag,
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom, kSecReturnRef as String: true,
    ]
    var existing: CFTypeRef?
    let found = SecItemCopyMatching(query as CFDictionary, &existing)
    if found == errSecSuccess, let existing {
      key = (existing as! SecKey)
    } else {
      guard found == errSecItemNotFound else { throw NativeRegistrationError.invalid }
      var error: Unmanaged<CFError>?
      guard
        let access = SecAccessControlCreateWithFlags(
          nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, &error)
      else { throw NativeRegistrationError.invalid }
      var attributes: [String: Any] = [
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeySizeInBits as String: 256,
        kSecPrivateKeyAttrs as String: [
          kSecAttrIsPermanent as String: true, kSecAttrApplicationTag as String: tag,
          kSecAttrAccessControl as String: access,
        ],
      ]
      #if DEBUG && targetEnvironment(simulator)
        // Debug simulator cannot provide a Secure Enclave. Never export it.
      #else
        guard SecureEnclave.isAvailable else { throw NativeRegistrationError.invalid }
        attributes[kSecAttrTokenID as String] = kSecAttrTokenIDSecureEnclave
      #endif
      guard let created = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
        throw NativeRegistrationError.invalid
      }
      key = created
    }
    var error: Unmanaged<CFError>?
    guard let publicKey = SecKeyCopyPublicKey(key),
      let point = SecKeyCopyExternalRepresentation(publicKey, &error) as Data?, point.count == 65,
      point.first == 4
    else { throw NativeRegistrationError.invalid }
    spki =
      Data([
        0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08,
        0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
      ]) + point
    fingerprint = SHA256.hash(data: spki).map { String(format: "%02x", $0) }.joined()
  }
  func sign(_ bytes: Data) throws -> Data {
    var error: Unmanaged<CFError>?
    guard
      let signature = SecKeyCreateSignature(
        key, .ecdsaSignatureMessageX962SHA256, bytes as CFData, &error) as Data?
    else { throw NativeRegistrationError.invalid }
    return signature
  }
}
