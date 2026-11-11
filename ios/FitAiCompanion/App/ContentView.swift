import SwiftUI
import FitAiSyncCore

struct ContentView:View {
    @ObservedObject var model:HealthSyncController
    @State private var code=""
    @State private var confirmDisconnect=false
    @Environment(\.scenePhase) private var scenePhase
    var body:some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:24) {
                    VStack(alignment:.leading,spacing:12) {
                        Image(systemName:"figure.strengthtraining.traditional").font(.system(size:44)).foregroundStyle(.purple)
                        Text("Your Watch.\nYour FitAi rhythm.").font(.largeTitle.bold())
                        Text("Bring permitted Apple Health steps and completed workouts into your private FitAi account.").foregroundStyle(.secondary)
                    }.padding(.vertical)
                    GroupBox {
                        VStack(alignment:.leading,spacing:14) {
                            Label("1 · Choose Apple Health access",systemImage:"heart.text.square").font(.headline)
                            Text("Read-only steps and workouts. No heart rate, routes, sleep, nutrition or writing back to Health.").font(.subheadline).foregroundStyle(.secondary)
                            Button(model.permissionRequested ? "Review Health access request" : "Choose Health permissions") {Task{await model.requestHealth()}}.buttonStyle(.bordered).disabled(model.busy)
                            Text("Apple does not tell FitAi whether you allowed every read permission. Missing data is never treated as zero.").font(.caption).foregroundStyle(.secondary)
                        }.frame(maxWidth:.infinity,alignment:.leading)
                    }
                    GroupBox {
                        VStack(alignment:.leading,spacing:14) {
                            Label("2 · Pair your FitAi account",systemImage:"link").font(.headline)
                            if let connection=model.connection {
                                Text(connection.pairing.accountLabel).fontWeight(.semibold)
                                Text("Day boundary: \(connection.pairing.timeZone)").font(.caption).foregroundStyle(.secondary)
                                Button("Disconnect iPhone",role:.destructive){confirmDisconnect=true}.disabled(model.busy)
                            } else {
                                Text("On the FitAi website, sign in and open Watch & steps. Generate a private, single-use pairing code, then paste it here.").font(.subheadline).foregroundStyle(.secondary)
                                Link("Open FitAi setup",destination:SyncClient.origin.appendingPathComponent("connections"))
                                TextField("Private pairing code",text:$code).textInputAutocapitalization(.never).autocorrectionDisabled().textContentType(.oneTimeCode).textFieldStyle(.roundedBorder).privacySensitive()
                                Button("Pair this iPhone"){let value=code;code="";Task{await model.pair(value)}}.buttonStyle(.borderedProminent).disabled(model.busy||code.isEmpty)
                            }
                        }.frame(maxWidth:.infinity,alignment:.leading)
                    }
                    GroupBox {
                        VStack(alignment:.leading,spacing:14) {
                            Label("3 · Sync permitted data",systemImage:"arrow.triangle.2.circlepath").font(.headline)
                            Toggle("Automatically sync to my FitAi account",isOn:Binding(get:{model.automatic},set:{value in Task{await model.setAutomatic(value)}})).disabled(model.connection==nil||!model.permissionRequested)
                            Text("Enabling uploads daily step totals and workout type, start/end time, duration and source for today and the previous 30 days. Your private data is not sent to AI by this companion.").font(.caption).foregroundStyle(.secondary)
                            Button("Sync now"){Task{await model.sync()}}.buttonStyle(.borderedProminent).disabled(model.busy||!model.automatic)
                            if model.busy {ProgressView("Syncing…")}
                            if let synced=model.lastSync,let date=SyncDates.date(synced) {Text("Last received: \(date.formatted(date:.abbreviated,time:.shortened))").font(.caption)}
                            Text("Steps may refresh hourly in the background. iOS controls delivery; updates can wait while the phone is locked, offline or force-quit. Opening FitAi retries pending changes.").font(.caption).foregroundStyle(.secondary)
                        }.frame(maxWidth:.infinity,alignment:.leading)
                    }
                    if !model.message.isEmpty {Text(model.message).font(.subheadline).accessibilityAddTraits(.updatesFrequently)}
                    Link("Open my FitAi dashboard",destination:SyncClient.origin).frame(maxWidth:.infinity).padding()
                    Text("This iPhone reads Apple Watch data once it has reached Apple Health. Manually logged workouts stay separate, so an activity recorded in both places may appear in both lists.").font(.caption).foregroundStyle(.secondary)
                }.padding()
            }.navigationTitle("FitAi Companion").navigationBarTitleDisplayMode(.inline)
        }.tint(.purple)
        .onOpenURL{url in if let value=try? PairingCode.parse(url.absoluteString) {code=value}}
        .onChange(of:scenePhase){_,phase in if phase == .active {Task{await model.resume()}}}
        .task{await model.resume()}
        .confirmationDialog("Disconnect this iPhone from FitAi?",isPresented:$confirmDisconnect,titleVisibility:.visible){Button("Disconnect",role:.destructive){Task{await model.disconnect()}}}message:{Text("Uploads stop. Existing imported data stays in your account until you remove it on the website.")}
    }
}
