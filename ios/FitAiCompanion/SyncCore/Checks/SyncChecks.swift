import Foundation
import FitAiSyncCore
final class TransportStub:URLProtocol {
    static var handler:((URLRequest)throws->(Int,Data))?
    override class func canInit(with request:URLRequest)->Bool {true}
    override class func canonicalRequest(for request:URLRequest)->URLRequest {request}
    override func startLoading(){do{let (status,data)=try Self.handler!(request);client?.urlProtocol(self,didReceive:HTTPURLResponse(url:request.url!,statusCode:status,httpVersion:nil,headerFields:["Content-Type":"application/json"])!,cacheStoragePolicy:.notAllowed);client?.urlProtocol(self,didLoad:data);client?.urlProtocolDidFinishLoading(self)}catch{client?.urlProtocol(self,didFailWithError:error)}}
    override func stopLoading(){}
}
struct CheckFailure:Error {let message:String}
func check(_ condition:Bool,_ message:String)throws {if !condition{throw CheckFailure(message:message)}}
@main struct Checks {
    static func main()async throws {
        let token=String(repeating:"a",count:43)
        try check(PairingCode.parse(token)==token,"raw code")
        try check(PairingCode.parse("fitai://pair?code=\(token)")==token,"exact deep link")
        for invalid in ["1234","https://evil.test?code=\(token)","fitai://pair/path?code=\(token)","fitai://pair?code=\(token)&origin=https://evil.test"] {do{_=try PairingCode.parse(invalid);throw CheckFailure(message:"accepted invalid pairing link")}catch is SyncError{}}
        let ids=(0..<450).map{_ in UUID()};let pages=try SyncBatch.pages(timeZone:"Europe/London",steps:[.init(date:"2026-11-11",steps:6500)],workouts:[],deleted:ids)
        try check(pages.count==3&&pages.flatMap(\.deletedWorkoutIds)==ids&&pages.flatMap(\.steps).count==1,"lossless upload paging")
        do{_=try SyncBatch.pages(timeZone:"Europe/London",steps:[.init(date:"2026-11-11",steps:1),.init(date:"2026-11-11",steps:2)],workouts:[],deleted:[]);throw CheckFailure(message:"accepted duplicate day")}catch is SyncError{}
        let date=SyncDates.date("2026-10-26T00:30:00Z")!,start=SyncDates.windowStart(now:SyncDates.date("2026-10-26T00:30:00Z")!,zone:"Europe/London")
        try check(SyncDates.day(start,zone:"Europe/London")=="2026-09-26"&&SyncDates.calendar("Europe/London").component(.hour,from:start)==0,"DST daily window")
        try check(SyncDates.day(date,zone:"Pacific/Pago_Pago")=="2026-10-25","timezone day")
        let config=URLSessionConfiguration.ephemeral;config.protocolClasses=[TransportStub.self];let client=SyncClient(session:URLSession(configuration:config))
        TransportStub.handler={request in
            try check(request.url?.absoluteString=="https://app.aifittraining.uk/api/health/pair/redeem"&&request.url?.query==nil,"fixed TLS pairing origin")
            try check(request.value(forHTTPHeaderField:"Authorization")==nil,"pairing needs no previous credential")
            return (200,Data("{\"token\":\"\(token)\",\"deviceId\":\"11111111-1111-4111-8111-111111111111\",\"timeZone\":\"Europe/London\",\"accountLabel\":\"test@example.test\",\"pairedAt\":\"2026-11-11T12:00:00+00:00\"}".utf8))
        }
        let pairing=try await client.pair(code:token,deviceName:"iPhone");try check(pairing.token==token,"validated pairing response")
        var requests=0;TransportStub.handler={request in
            requests+=1;try check(request.value(forHTTPHeaderField:"Authorization")=="Bearer \(token)"&&request.url?.query==nil,"scoped token in header only")
            return(200,Data("{\"accepted\":true,\"receivedAt\":\"2026-11-11T12:00:00Z\"}".utf8))
        }
        let receipt=try await client.upload(pages[0],token:token);try check(receipt=="2026-11-11T12:00:00Z"&&requests==1,"one acknowledged upload")
        for (status,expected) in [(401,SyncError.revoked),(503,SyncError.unavailable),(409,SyncError.stale)] {
            requests=0;TransportStub.handler={_ in requests+=1;return(status,Data("{}".utf8))}
            do{_=try await client.upload(pages[0],token:token);throw CheckFailure(message:"accepted failed upload")}catch let error as SyncError{try check(error==expected,"typed error")}
            try check(requests==1,"no hidden retries")
        }
        TransportStub.handler={_ in(200,Data("{\"accepted\":false,\"receivedAt\":\"2026-11-11T12:00:00Z\"}".utf8))}
        do{_=try await client.upload(pages[0],token:token);throw CheckFailure(message:"accepted malformed acknowledgement")}catch let error as SyncError{try check(error == .invalidResponse,"invalid receipt")}
        print("PASS: pairing validation, lossless paging, duplicate guard, DST/timezones, TLS origin, authenticated acknowledgement, no-retry errors, malformed receipts")
    }
}
