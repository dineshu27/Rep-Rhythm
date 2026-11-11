import Foundation

public enum SyncError: Error, LocalizedError, Equatable {
    case invalidCode, invalidResponse, notPaired, revoked, unavailable, stale, rejected
    public var errorDescription: String? {
        switch self {
        case .invalidCode: return "Paste the one-time code generated in FitAi → Watch & steps."
        case .invalidResponse: return "FitAi returned an invalid response. Nothing new was confirmed."
        case .notPaired: return "Pair this iPhone with your FitAi account first."
        case .revoked: return "This iPhone connection was revoked. Pair again from FitAi."
        case .unavailable: return "FitAi cloud sync is not ready or is unavailable. Your records are preserved."
        case .stale: return "A newer sync is already on FitAi. Run Sync now to refresh."
        case .rejected: return "FitAi could not accept these records. Check your iPhone clock and reconnect if your timezone changed."
        }
    }
}
public enum PairingCode {
    public static func parse(_ input: String) throws -> String {
        var code = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if let url = URLComponents(string: code), url.scheme != nil {
            guard url.scheme == "fitai", url.host == "pair", url.path.isEmpty, url.fragment == nil,
                  let items = url.queryItems, items.count == 1, items[0].name == "code", let value = items[0].value else { throw SyncError.invalidCode }
            code = value
        }
        guard code.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else { throw SyncError.invalidCode }
        return code
    }
}
public struct Pairing: Codable, Sendable {
    public let token: String
    public let deviceId: UUID
    public let timeZone: String
    public let accountLabel: String
    public let pairedAt: String
    public init(token: String, deviceId: UUID, timeZone: String, accountLabel: String, pairedAt: String) {
        self.token=token; self.deviceId=deviceId; self.timeZone=timeZone; self.accountLabel=accountLabel; self.pairedAt=pairedAt
    }
    public func validate() throws {
        guard (try? PairingCode.parse(token)) == token, TimeZone(identifier: timeZone) != nil,
              !accountLabel.isEmpty, accountLabel.count <= 254, SyncDates.date(pairedAt) != nil else { throw SyncError.invalidResponse }
    }
}
public struct StepDay: Codable, Sendable, Equatable {
    public let date: String
    public let steps: Int
    public init(date: String, steps: Int) { self.date=date; self.steps=steps }
}
public struct HealthWorkout: Codable, Sendable, Equatable {
    public let id: UUID
    public let name: String
    public let activityCode: Int
    public let startedAt: String
    public let finishedAt: String
    public let durationSeconds: Double
    public let source: String
    public init(id: UUID, name: String, activityCode: Int, startedAt: String, finishedAt: String, durationSeconds: Double, source: String) {
        self.id=id; self.name=name; self.activityCode=activityCode; self.startedAt=startedAt; self.finishedAt=finishedAt; self.durationSeconds=durationSeconds; self.source=source
    }
}
public struct SyncBatch: Encodable, Sendable {
    public let version = 1
    public let timeZone: String
    public let generatedAt: String
    public let steps: [StepDay]
    public let workouts: [HealthWorkout]
    public let deletedWorkoutIds: [UUID]
    public init(timeZone: String, generatedAt: String, steps: [StepDay], workouts: [HealthWorkout], deletedWorkoutIds: [UUID]) {
        self.timeZone=timeZone; self.generatedAt=generatedAt; self.steps=steps; self.workouts=workouts; self.deletedWorkoutIds=deletedWorkoutIds
    }
    public static func pages(timeZone: String, steps: [StepDay], workouts: [HealthWorkout], deleted: [UUID], now: Date = Date()) throws -> [SyncBatch] {
        guard TimeZone(identifier: timeZone) != nil, steps.count<=31, Set(steps.map(\.date)).count==steps.count,
              steps.allSatisfy({ $0.steps>=0 && $0.steps<=100000 }), Set(workouts.map(\.id)).count==workouts.count,
              Set(deleted).count==deleted.count, Set(workouts.map(\.id)).isDisjoint(with: Set(deleted)) else { throw SyncError.rejected }
        let count=max(1, (max(workouts.count,deleted.count)+199)/200)
        return (0..<count).map { index in
            SyncBatch(timeZone: timeZone, generatedAt: SyncDates.string(now), steps: index==0 ? steps : [],
                      workouts: Array(workouts.dropFirst(index*200).prefix(200)), deletedWorkoutIds: Array(deleted.dropFirst(index*200).prefix(200)))
        }
    }
}
public enum SyncDates {
    public static func string(_ date: Date) -> String { let f=ISO8601DateFormatter(); f.formatOptions=[.withInternetDateTime,.withFractionalSeconds]; return f.string(from: date) }
    public static func date(_ text: String) -> Date? { let f=ISO8601DateFormatter(); f.formatOptions=[.withInternetDateTime,.withFractionalSeconds]; return f.date(from:text) ?? ISO8601DateFormatter().date(from:text) }
    public static func calendar(_ zone: String) -> Calendar { var cal=Calendar(identifier:.gregorian); cal.timeZone=TimeZone(identifier:zone) ?? TimeZone(secondsFromGMT:0)!; return cal }
    public static func day(_ date: Date, zone: String) -> String { let f=DateFormatter(); f.locale=Locale(identifier:"en_US_POSIX"); f.calendar=calendar(zone); f.timeZone=f.calendar.timeZone; f.dateFormat="yyyy-MM-dd"; return f.string(from:date) }
    public static func windowStart(now: Date, zone: String) -> Date { let cal=calendar(zone); return cal.date(byAdding:.day,value:-30,to:cal.startOfDay(for:now))! }
}
