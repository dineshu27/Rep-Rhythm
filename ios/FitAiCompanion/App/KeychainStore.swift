import Foundation
import Security
import FitAiSyncCore

struct StoredConnection: Codable {
    var pairing: Pairing
    var historyStart: Date
    var workoutAnchor: Data?
}
enum KeychainStore {
    private static let base:[String:Any]=[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:"uk.aifittraining.companion",kSecAttrAccount as String:"iphone-connection"]
    static func load() throws -> StoredConnection? {
        var query=base; query[kSecReturnData as String]=true; query[kSecMatchLimit as String]=kSecMatchLimitOne
        var result:CFTypeRef?; let status=SecItemCopyMatching(query as CFDictionary,&result)
        if status==errSecItemNotFound {return nil}
        guard status==errSecSuccess,let data=result as? Data else {throw KeychainError.unavailable}
        let value=try JSONDecoder().decode(StoredConnection.self,from:data);try value.pairing.validate();return value
    }
    static func save(_ value:StoredConnection) throws {
        let data=try JSONEncoder().encode(value)
        let attributes:[String:Any]=[kSecValueData as String:data,kSecAttrAccessible as String:kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let status=SecItemUpdate(base as CFDictionary,attributes as CFDictionary)
        if status==errSecItemNotFound {var insert=base;attributes.forEach{insert[$0.key]=$0.value};guard SecItemAdd(insert as CFDictionary,nil)==errSecSuccess else {throw KeychainError.unavailable}}
        else if status != errSecSuccess {throw KeychainError.unavailable}
    }
    static func delete() throws {let status=SecItemDelete(base as CFDictionary);guard status==errSecSuccess||status==errSecItemNotFound else {throw KeychainError.unavailable}}
    enum KeychainError:Error,LocalizedError {case unavailable; var errorDescription:String?{"Unlock your iPhone to access the secure connection."}}
}
