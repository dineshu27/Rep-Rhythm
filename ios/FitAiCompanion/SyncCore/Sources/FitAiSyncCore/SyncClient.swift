import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
private final class NoRedirects: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
public struct SyncClient: Sendable {
    public static let origin=URL(string:"https://app.aifittraining.uk")!
    private let session: URLSession
    public init(session: URLSession? = nil) {
        let config=URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest=20; config.timeoutIntervalForResource=25
        config.httpShouldSetCookies=false; config.urlCache=nil
        self.session=session ?? URLSession(configuration:config,delegate:NoRedirects(),delegateQueue:nil)
    }
    private func post(_ path:String,body:Data?,token:String?=nil) async throws -> Data {
        var request=URLRequest(url:Self.origin.appendingPathComponent(path))
        request.httpMethod="POST"; request.httpBody=body; request.setValue("application/json",forHTTPHeaderField:"Content-Type")
        request.cachePolicy = .reloadIgnoringLocalCacheData
        if let token { guard (try? PairingCode.parse(token)) == token else { throw SyncError.notPaired }; request.setValue("Bearer \(token)",forHTTPHeaderField:"Authorization") }
        let (data,response)=try await session.data(for:request)
        guard let http=response as? HTTPURLResponse else { throw SyncError.invalidResponse }
        switch http.statusCode { case 200: guard data.count<=262144 else {throw SyncError.invalidResponse}; return data
        case 401: throw SyncError.revoked
        case 409: throw SyncError.stale
        case 503: throw SyncError.unavailable
        default: throw SyncError.rejected }
    }
    public func pair(code:String,deviceName:String) async throws -> Pairing {
        let code=try PairingCode.parse(code)
        let body=try JSONEncoder().encode(["code":code,"deviceName":String(deviceName.prefix(80))])
        let value=try JSONDecoder().decode(Pairing.self,from:await post("api/health/pair/redeem",body:body))
        try value.validate(); return value
    }
    public func upload(_ batch:SyncBatch,token:String) async throws -> String {
        struct Receipt:Decodable {let accepted:Bool;let receivedAt:String}
        let receipt=try JSONDecoder().decode(Receipt.self,from:await post("api/health/sync",body:JSONEncoder().encode(batch),token:token))
        guard receipt.accepted, SyncDates.date(receipt.receivedAt) != nil else {throw SyncError.invalidResponse}; return receipt.receivedAt
    }
    public func disconnect(token:String) async throws {
        struct Receipt:Decodable {let revoked:Bool}
        let receipt=try JSONDecoder().decode(Receipt.self,from:await post("api/health/disconnect",body:Data("{}".utf8),token:token))
        guard receipt.revoked else {throw SyncError.invalidResponse}
    }
}
