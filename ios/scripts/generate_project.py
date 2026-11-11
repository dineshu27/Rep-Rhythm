"""Generate the dependency-free Xcode project. No credentials or signing team are stored."""
from pathlib import Path
from hashlib import sha256
root=Path(__file__).resolve().parents[1]/'FitAiCompanion'
def uid(value): return sha256(value.encode()).hexdigest()[:24].upper()
objects=[]
def obj(name,body):
    objects.append(f'{uid(name)} = {{ {body} }};')
    return uid(name)
files=sorted((root/'App').glob('*.swift'))
source_refs=[];source_builds=[]
for file in files:
    source_refs.append(obj(file.name,f'isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {file.name}; sourceTree = "<group>";'))
    source_builds.append(obj('build'+file.name,f'isa = PBXBuildFile; fileRef = {uid(file.name)};'))
resources=[];resource_refs=[]
for path,kind in [('Assets.xcassets','folder.assetcatalog'),('PrivacyInfo.xcprivacy','text.xml')]:
    resource_refs.append(obj(path,f'isa = PBXFileReference; lastKnownFileType = {kind}; path = {path}; sourceTree = "<group>";'))
    resources.append(obj('build'+path,f'isa = PBXBuildFile; fileRef = {uid(path)};'))
for path in ['Info.plist','FitAiCompanion.entitlements']:
    resource_refs.append(obj(path,f'isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = {path}; sourceTree = "<group>";'))
obj('product','isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = FitAiCompanion.app; sourceTree = BUILT_PRODUCTS_DIR;')
obj('appgroup',f'isa = PBXGroup; path = App; sourceTree = "<group>"; children = ({",".join(source_refs)},);')
obj('products',f'isa = PBXGroup; name = Products; sourceTree = "<group>"; children = ({uid("product")},);')
obj('main',f'isa = PBXGroup; sourceTree = "<group>"; children = ({uid("appgroup")},{",".join(resource_refs)},{uid("products")},);')
obj('package','isa = XCLocalSwiftPackageReference; relativePath = SyncCore;')
obj('dependency',f'isa = XCSwiftPackageProductDependency; package = {uid("package")}; productName = FitAiSyncCore;')
obj('frameworkbuild',f'isa = PBXBuildFile; productRef = {uid("dependency")};')
obj('sources',f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ({",".join(source_builds)},); runOnlyForDeploymentPostprocessing = 0;')
obj('resources',f'isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = ({",".join(resources)},); runOnlyForDeploymentPostprocessing = 0;')
obj('frameworks',f'isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = ({uid("frameworkbuild")},); runOnlyForDeploymentPostprocessing = 0;')
for config in ['Debug','Release']:
    common='IPHONEOS_DEPLOYMENT_TARGET = 17.0; SDKROOT = iphoneos; CLANG_ENABLE_MODULES = YES; SWIFT_VERSION = 5.0;'
    obj('project'+config,f'isa = XCBuildConfiguration; name = {config}; buildSettings = {{{common}}};')
    settings=common+' ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon; CODE_SIGN_STYLE = Automatic; CODE_SIGN_ENTITLEMENTS = FitAiCompanion.entitlements; INFOPLIST_FILE = Info.plist; GENERATE_INFOPLIST_FILE = NO; PRODUCT_BUNDLE_IDENTIFIER = uk.aifittraining.companion; PRODUCT_NAME = "$(TARGET_NAME)"; TARGETED_DEVICE_FAMILY = 1; SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"; SUPPORTS_MACCATALYST = NO;'
    if config=='Debug': settings+=' SWIFT_OPTIMIZATION_LEVEL = "-Onone"; DEBUG_INFORMATION_FORMAT = dwarf;'
    else: settings+=' SWIFT_OPTIMIZATION_LEVEL = "-O"; DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";'
    obj('target'+config,f'isa = XCBuildConfiguration; name = {config}; buildSettings = {{{settings}}};')
for group in ['project','target']:
    obj(group+'config',f'isa = XCConfigurationList; buildConfigurations = ({uid(group+"Debug")},{uid(group+"Release")},); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
obj('target',f'isa = PBXNativeTarget; buildConfigurationList = {uid("targetconfig")}; buildPhases = ({uid("sources")},{uid("frameworks")},{uid("resources")},); buildRules = (); dependencies = (); name = FitAiCompanion; packageProductDependencies = ({uid("dependency")},); productName = FitAiCompanion; productReference = {uid("product")}; productType = "com.apple.product-type.application";')
obj('project',f'isa = PBXProject; attributes = {{BuildIndependentTargetsInParallel = YES; LastUpgradeCheck = 1600; TargetAttributes = {{{uid("target")} = {{CreatedOnToolsVersion = 16.0; SystemCapabilities = {{com.apple.HealthKit = {{enabled = 1;}};}};}};}};}}; buildConfigurationList = {uid("projectconfig")}; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; knownRegions = (en,Base,); mainGroup = {uid("main")}; packageReferences = ({uid("package")},); productRefGroup = {uid("products")}; projectDirPath = ""; projectRoot = ""; targets = ({uid("target")},);')
project=root/'FitAiCompanion.xcodeproj';project.mkdir(exist_ok=True)
(project/'project.pbxproj').write_text('// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = {\n'+'\n'.join(objects)+'\n}; rootObject = '+uid('project')+'; }\n')
scheme=project/'xcshareddata/xcschemes';scheme.mkdir(parents=True,exist_ok=True)
ref=f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{uid("target")}" BuildableName="FitAiCompanion.app" BlueprintName="FitAiCompanion" ReferencedContainer="container:FitAiCompanion.xcodeproj"/>'
(scheme/'FitAiCompanion.xcscheme').write_text(f'<?xml version="1.0" encoding="UTF-8"?><Scheme LastUpgradeVersion="1600" version="1.3"><BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{ref}</BuildActionEntry></BuildActionEntries></BuildAction><TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"/><LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{ref}</BuildableProductRunnable></LaunchAction><ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{ref}</BuildableProductRunnable></ProfileAction><AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/></Scheme>')
print('Generated',project)
