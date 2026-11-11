import XCTest
@testable import FitAiSyncCore
final class MockProtocol:URLProtocol {
    static var handler:((URLRequest)throws->(Int,Data))?
    override class func canInit(with request:URLRequest)->Bool {true}
    override class func canonicalRequest(for request:URLRequest)->URLRequest {request}
    override func startLoading(){do{let (status,data)=try Self.handler!(request);client?.urlProtocol(self,didReceive:HTTPURLResponse(url:request.url!,statusCode:status,httpVersion:nil,headerFields:["Content-Type":"application/json"])!,cacheStoragePolicy:.notAllowed);client?.urlProtocol(self,didLoad:data);client?.urlProtocolDidFinishLoading(self)}catch{client?.urlProtocol(self,didFailWithError:error)}}
    override func stopLoading(){}
}
final class SyncCoreTests:XCTestCase {
    let code=String(repeating:"a",count:43)
    override func tearDown(){MockProtocol.handler=nil;super.tearDown()}
    func client()->SyncClient {let config=URLSessionConfiguration.ephemeral;config.protocolClasses=[MockProtocol.self];return SyncClient(session:URLSession(configuration:config))}
    func testPairCodeAcceptsOnlyPrivateCodeOrExactAppLink()throws{
        XCTAssertEqual(try PairingCode.parse(code),code);XCTAssertEqual(try PairingCode.parse("fitai://pair?code=\(code)"),code)
        for bad in ["123456","https://evil.example/pair?code=\(code)","fitai://pair?code=\(code)&origin=https://evil.example","fitai://pair/path?code=\(code)"]{XCTAssertThrowsError(try PairingCode.parse(bad))}
    }
    func testPagingKeepsEveryDeletionAndSendsDailyTotalsOnlyOnce()throws{
        let ids=(0..<450).map{_ in UUID()};let pages=try SyncBatch.pages(timeZone:"Europe/London",steps:[StepDay(date:"2026-11-11",steps:6500)],workouts:[],deleted:ids)
        XCTAssertEqual(pages.count,3);XCTAssertEqual(pages.flatMap(\.deletedWorkoutIds),ids);XCTAssertEqual(pages.flatMap(\.steps).count,1);XCTAssertTrue(pages.allSatisfy{$0.deletedWorkoutIds.count<=200})
    }
    func testDuplicateDaysAndContradictoryMutationsAreRefused(){
        XCTAssertThrowsError(try SyncBatch.pages(timeZone:"Europe/London",steps:[.init(date:"2026-11-11",steps:1),.init(date:"2026-11-11",steps:2)],workouts:[],deleted:[]))
        XCTAssertThrowsError(try SyncBatch.pages(timeZone:"Europe/London",steps:[.init(date:"2026-11-11",steps:-1)],workouts:[],deleted:[]))
    }
    func testDateWindowRespectsCalendarDaysAcrossDST()throws{
        let date=try XCTUnwrap(SyncDates.date("2026-10-26T00:30:00Z"));let start=SyncDates.windowStart(now:date,zone:"Europe/London")
        XCTAssertEqual(SyncDates.day(start,zone:"Europe/London"),"2026-09-26");XCTAssertEqual(SyncDates.day(date,zone:"Pacific/Kiritimati"),"2026-10-26")
        XCTAssertEqual(SyncDates.calendar("Europe/London").component(.hour,from:start),0)
    }
    func testPairingUsesFixedTLSOriginAndDoesNotPutCodeInURL()async throws{
        MockProtocol.handler={request in
            XCTAssertEqual(request.url?.absoluteString,"https://app.aifittraining.uk/api/health/pair/redeem");XCTAssertNil(request.url?.query);XCTAssertEqual(request.httpMethod,"POST");XCTAssertNil(request.value(forHTTPHeaderField:"Authorization"))
            return (200,Data("{\"token\":\"\(self.code)\",\"deviceId\":\"11111111-1111-4111-8111-111111111111\",\"timeZone\":\"Europe/London\",\"accountLabel\":\"test@example.com\",\"pairedAt\":\"2026-11-11T12:00:00Z\"}".utf8))
        }
        let value=try await client().pair(code:code,deviceName:"FitAi iPhone");XCTAssertEqual(value.token,code)
    }
    func testUploadRequiresAcknowledgementAndKeepsTokenInHeader()async throws{
        var count=0;MockProtocol.handler={request in count+=1;XCTAssertEqual(request.value(forHTTPHeaderField:"Authorization"),"Bearer \(self.code)");XCTAssertNil(request.url?.query);return (200,Data("{\"accepted\":true,\"receivedAt\":\"2026-11-11T12:00:00Z\"}".utf8))}
        let batch=try SyncBatch.pages(timeZone:"Europe/London",steps:[],workouts:[],deleted:[])[0];let receipt=try await client().upload(batch,token:code);XCTAssertEqual(receipt,"2026-11-11T12:00:00Z");XCTAssertEqual(count,1)
    }
    func testRevocationAndBackendUnavailableAreNotRetried()async throws{
        for (status,expected) in [(401,SyncError.revoked),(503,SyncError.unavailable),(409,SyncError.stale)] {
            var count=0;MockProtocol.handler={_ in count+=1;return(status,Data("{}".utf8))}
            do{_ = try await client().upload(try SyncBatch.pages(timeZone:"Europe/London",steps:[],workouts:[],deleted:[])[0],token:code);XCTFail("Expected rejection")}catch{XCTAssertEqual(error as? SyncError,expected)}
            XCTAssertEqual(count,1)
        }
    }
    func testMalformedReceiptIsNotConfirmed()async throws{
        MockProtocol.handler={_ in (200,Data("{\"accepted\":false,\"receivedAt\":\"2026-11-11T12:00:00Z\"}".utf8))}
        do{_ = try await client().upload(try SyncBatch.pages(timeZone:"Europe/London",steps:[],workouts:[],deleted:[])[0],token:code);XCTFail("Expected rejection")}catch{XCTAssertEqual(error as? SyncError,.invalidResponse)}
    }
}
