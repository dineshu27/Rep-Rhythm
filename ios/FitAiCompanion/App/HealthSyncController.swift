import Foundation
import Combine
@preconcurrency import HealthKit
import FitAiSyncCore

@MainActor final class HealthSyncController:ObservableObject {
    static let shared=HealthSyncController()
    @Published private(set) var connection:StoredConnection?
    @Published private(set) var busy=false
    @Published var message=""
    @Published private(set) var permissionRequested=false
    @Published private(set) var automatic=false
    @Published private(set) var lastSync:String?
    private let reader=HealthKitReader(),client=SyncClient()
    private var observers:[HKObserverQuery]=[]
    private var needsSync=false
    private init(){
        permissionRequested=UserDefaults.standard.bool(forKey:"healthReadRequested")
        automatic=UserDefaults.standard.bool(forKey:"healthAutomaticSync")
        lastSync=UserDefaults.standard.string(forKey:"healthLastSync")
        do {connection=try KeychainStore.load()} catch {message=error.localizedDescription}
    }
    func launch(){if automatic&&permissionRequested&&connection != nil {installObservers()}}
    func requestHealth() async {
        do {try await reader.requestReadAccess();permissionRequested=true;UserDefaults.standard.set(true,forKey:"healthReadRequested");message="Permission request completed. Apple doesn’t reveal which read permissions were granted. Check Health settings if data is missing."}
        catch {message=error.localizedDescription}
    }
    func pair(_ text:String) async {
        guard !busy else{return};busy=true;defer{busy=false}
        do {
            let pairing=try await client.pair(code:text,deviceName:"FitAi iPhone")
            let value=StoredConnection(pairing:pairing,historyStart:SyncDates.windowStart(now:Date(),zone:pairing.timeZone),workoutAnchor:nil)
            try KeychainStore.save(value);connection=value;lastSync=nil;UserDefaults.standard.removeObject(forKey:"healthLastSync")
            message="Paired to \(pairing.accountLabel). Enable automatic sync when you are ready to upload."
            // Pairing never silently enables uploading, even when replacing a previous connection.
            await setAutomatic(false)
        } catch {message=error.localizedDescription}
    }
    func setAutomatic(_ enabled:Bool) async {
        if enabled && (!permissionRequested||connection==nil) {message="Request Apple Health access and pair this iPhone first.";return}
        automatic=enabled;UserDefaults.standard.set(enabled,forKey:"healthAutomaticSync")
        if enabled {installObservers();await sync()}
        else {observers.forEach{reader.store.stop($0)};observers=[];try? await reader.store.disableAllBackgroundDelivery()}
    }
    private func installObservers(){
        guard observers.isEmpty,HKHealthStore.isHealthDataAvailable() else{return}
        for type in [reader.stepType as HKSampleType,reader.workoutType as HKSampleType] {
            let query=HKObserverQuery(sampleType:type,predicate:nil) { [weak self] _,completion,error in
                Task { @MainActor in
                    defer{completion()}
                    guard let self else{return}
                    if let error {self.message=error.localizedDescription;return}
                    await self.sync()
                }
            }
            observers.append(query);reader.store.execute(query)
            reader.store.enableBackgroundDelivery(for:type,frequency:type==reader.stepType ? .hourly:.immediate) { [weak self] _,error in
                if let error {Task { @MainActor in self?.message="Background updates are unavailable: \(error.localizedDescription). Open the app to sync."}}
            }
        }
    }
    func resume() async {if connection==nil {do{connection=try KeychainStore.load()}catch{message=error.localizedDescription}};launch();if automatic {await sync()}}
    func sync() async {
        guard automatic,permissionRequested,connection != nil else{return}
        if busy {needsSync=true;return}
        busy=true;defer{busy=false}
        repeat {
            needsSync=false
            do {try await performSync()}
            catch {
                if error as? SyncError == .revoked {await setAutomatic(false);try? KeychainStore.delete();connection=nil}
                message=error.localizedDescription;needsSync=false
            }
        } while needsSync&&automatic
    }
    private func performSync() async throws {
        guard var saved=connection else{throw SyncError.notPaired}
        let now=Date(),zone=saved.pairing.timeZone
        var steps=try await reader.dailySteps(now:now,zone:zone)
        var anchor:HKQueryAnchor?=try saved.workoutAnchor.map{try NSKeyedUnarchiver.unarchivedObject(ofClass:HKQueryAnchor.self,from:$0)} ?? nil
        var more=true;var pages=0;var observed=steps.count
        while more&&automatic {
            let page=try await reader.workouts(anchor:anchor,historyStart:saved.historyStart,now:now,zone:zone)
            observed+=page.workouts.count
            let batches=try SyncBatch.pages(timeZone:zone,steps:steps,workouts:page.workouts,deleted:page.deleted)
            for batch in batches {
                guard automatic,connection?.pairing.deviceId==saved.pairing.deviceId else{return}
                lastSync=try await client.upload(batch,token:saved.pairing.token)
            }
            // Advance only after all page mutations are acknowledged. Retrying a failed page is idempotent.
            if let newAnchor=page.anchor {saved.workoutAnchor=try NSKeyedArchiver.archivedData(withRootObject:newAnchor,requiringSecureCoding:true);try KeychainStore.save(saved);connection=saved;anchor=newAnchor}
            steps=[];more=page.hasMore;pages+=1
            if pages>=20&&more {message="Recent pages saved. Open the app again to continue the remaining history.";return}
        }
        if let lastSync {UserDefaults.standard.set(lastSync,forKey:"healthLastSync")}
        message=observed==0 ? "No readable steps or workouts returned. Access may be denied, limited, or there may be no records. Previously uploaded data was not cleared." : "Your permitted Apple Health data was received by FitAi."
    }
    func disconnect() async {
        guard let value=connection,!busy else{return}
        await setAutomatic(false);busy=true;defer{busy=false}
        do {try await client.disconnect(token:value.pairing.token);try KeychainStore.delete();connection=nil;lastSync=nil;UserDefaults.standard.removeObject(forKey:"healthLastSync");message="Disconnected. Imported FitAi records were kept; manage removal on the website."}
        catch {if error as? SyncError == .revoked {do{try KeychainStore.delete();connection=nil;lastSync=nil;message="This iPhone was already disconnected."}catch{message=error.localizedDescription};return};message="Uploads are paused. Could not confirm server disconnection. Retry online or revoke this iPhone in FitAi → Watch & steps."}
    }
}
