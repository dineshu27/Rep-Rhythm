@preconcurrency import HealthKit
import Foundation
import FitAiSyncCore

final class HealthKitReader {
    let store=HKHealthStore()
    let stepType=HKObjectType.quantityType(forIdentifier:.stepCount)!
    let workoutType=HKObjectType.workoutType()
    func requestReadAccess() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {throw ReaderError.unavailable}
        try await store.requestAuthorization(toShare:[],read:[stepType,workoutType])
    }
    func dailySteps(now:Date,zone:String) async throws -> [StepDay] {
        let cal=SyncDates.calendar(zone), start=SyncDates.windowStart(now:now,zone:zone)
        return try await withThrowingTaskGroup(of:StepDay?.self) {group in
            for offset in 0..<31 {
                let from=cal.date(byAdding:.day,value:offset,to:start)!, next=cal.date(byAdding:.day,value:1,to:from)!, end=min(next,now)
                guard end>from else {continue}
                group.addTask { [self] in
                    let total:Double?=try await withCheckedThrowingContinuation {continuation in
                        let predicate=HKQuery.predicateForSamples(withStart:from,end:end,options:.strictStartDate)
                        let query=HKStatisticsQuery(quantityType:stepType,quantitySamplePredicate:predicate,options:.cumulativeSum) {_,statistics,error in
                            if let error {continuation.resume(throwing:error)} else {continuation.resume(returning:statistics?.sumQuantity()?.doubleValue(for:.count()))}
                        }
                        store.execute(query)
                    }
                    // A nil quantity may mean no data or denied access, never invent a zero or clear old uploads.
                    guard let total else {return nil}
                    guard total.isFinite,total>=0,total<=100000 else {throw SyncError.rejected}
                    return StepDay(date:SyncDates.day(from,zone:zone),steps:Int(total.rounded()))
                }
            }
            var days:[StepDay]=[];for try await day in group {if let day {days.append(day)}};return days.sorted{$0.date<$1.date}
        }
    }
    struct WorkoutPage {let workouts:[HealthWorkout];let deleted:[UUID];let anchor:HKQueryAnchor?;let hasMore:Bool}
    func workouts(anchor:HKQueryAnchor?,historyStart:Date,now:Date,zone:String) async throws -> WorkoutPage {
        try await withCheckedThrowingContinuation {continuation in
            let predicate=HKQuery.predicateForSamples(withStart:historyStart,end:nil,options:.strictStartDate)
            let query=HKAnchoredObjectQuery(type:workoutType,predicate:predicate,anchor:anchor,limit:200) {_,samples,deleted,newAnchor,error in
                if let error {continuation.resume(throwing:error);return}
                let values=(samples ?? []).compactMap{$0 as? HKWorkout}.filter{$0.startDate>=SyncDates.windowStart(now:now,zone:zone)&&$0.endDate<=now.addingTimeInterval(300)}.map {workout in
                    HealthWorkout(id:workout.uuid,name:Self.name(workout.workoutActivityType),activityCode:Int(workout.workoutActivityType.rawValue),startedAt:SyncDates.string(workout.startDate),finishedAt:SyncDates.string(workout.endDate),durationSeconds:workout.duration,source:workout.sourceRevision.source.bundleIdentifier)
                }
                continuation.resume(returning:WorkoutPage(workouts:values,deleted:(deleted ?? []).map(\.uuid),anchor:newAnchor,hasMore:(samples?.count ?? 0)>=200||(deleted?.count ?? 0)>=200))
            }
            store.execute(query)
        }
    }
    static func name(_ type:HKWorkoutActivityType)->String {
        switch type {case .walking:return "Walking";case .running:return "Running";case .cycling:return "Cycling";case .swimming:return "Swimming";case .traditionalStrengthTraining:return "Strength training";case .functionalStrengthTraining:return "Functional strength training";case .highIntensityIntervalTraining:return "Interval training";case .yoga:return "Yoga";case .pilates:return "Pilates";case .hiking:return "Hiking";case .rowing:return "Rowing";case .elliptical:return "Elliptical";case .dance:return "Dance";case .coreTraining:return "Core training";case .cooldown:return "Cooldown";default:return "Apple Health workout"}
    }
    enum ReaderError:Error,LocalizedError {case unavailable;var errorDescription:String?{"Apple Health is unavailable on this device."}}
}
