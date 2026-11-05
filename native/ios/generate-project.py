"""Generate the dependency-free Xcode project deterministically (Python stdlib)."""
from pathlib import Path
import json
import plistlib

root = Path(__file__).resolve().parent
objects = {}

def add(kind, **value):
    key = f'{len(objects)+1:024X}'
    objects[key] = dict(isa=kind, **value)
    return key

def configurations(settings):
    values = []
    for name in ['Debug', 'Release']:
        config = dict(settings)
        config.update(SWIFT_OPTIMIZATION_LEVEL='-Onone' if name == 'Debug' else '-O')
        config.update(SWIFT_ACTIVE_COMPILATION_CONDITIONS='DEBUG' if name == 'Debug' else '')
        if settings.get('PRODUCT_BUNDLE_IDENTIFIER') == 'com.velani.nevora.development':
            config['INFOPLIST_FILE'] = f'Configuration/{name}-Info.plist'
        values.append(add('XCBuildConfiguration', name=name, buildSettings=config))
    return add('XCConfigurationList', buildConfigurations=values, defaultConfigurationIsVisible=0, defaultConfigurationName='Release')

source_paths = [str(path.relative_to(root)) for directory in ['App', 'Sources/NevoraShellCore'] for path in sorted((root / directory).glob('*.swift'))]
references = [add('PBXFileReference', lastKnownFileType='sourcecode.swift', path=path, sourceTree='SOURCE_ROOT') for path in source_paths]
ui_reference = add('PBXFileReference', lastKnownFileType='sourcecode.swift', path='UITests/NevoraUITests.swift', sourceTree='SOURCE_ROOT')
app_resources = [add('PBXFileReference', lastKnownFileType='folder.assetcatalog', path='Assets.xcassets', sourceTree='SOURCE_ROOT'),
                 add('PBXFileReference', lastKnownFileType='text.xml', path='Configuration/PrivacyInfo.xcprivacy', sourceTree='SOURCE_ROOT')]
app_product = add('PBXFileReference', explicitFileType='wrapper.application', path='NEVORA.app', sourceTree='BUILT_PRODUCTS_DIR')
ui_product = add('PBXFileReference', explicitFileType='wrapper.cfbundle', path='NevoraUITests.xctest', sourceTree='BUILT_PRODUCTS_DIR')
products = add('PBXGroup', children=[app_product, ui_product], name='Products', sourceTree='<group>')
group = add('PBXGroup', children=references + app_resources + [ui_reference, products], sourceTree='<group>')

common = dict(SWIFT_VERSION='5.0', IPHONEOS_DEPLOYMENT_TARGET='16.0', SDKROOT='iphoneos',
              TARGETED_DEVICE_FAMILY='1,2', CODE_SIGN_STYLE='Automatic',
              CURRENT_PROJECT_VERSION='1', MARKETING_VERSION='0.1.0',
              NEVORA_BACKEND_ORIGIN='', NEVORA_NATIVE_PUSH_ENABLED='false', NEVORA_NATIVE_PUSH_ENVIRONMENT='', ENABLE_USER_SCRIPT_SANDBOXING='YES')
app_settings = dict(common, PRODUCT_NAME='NEVORA', PRODUCT_MODULE_NAME='Nevora',
                    ASSETCATALOG_COMPILER_APPICON_NAME='AppIcon',
                    PRODUCT_BUNDLE_IDENTIFIER='com.velani.nevora.development', GENERATE_INFOPLIST_FILE='NO',
                    LD_RUNPATH_SEARCH_PATHS='$(inherited) @executable_path/Frameworks')
ui_settings = dict(common, PRODUCT_NAME='NevoraUITests', PRODUCT_MODULE_NAME='NevoraUITests',
                   PRODUCT_BUNDLE_IDENTIFIER='com.velani.nevora.development.uitests', GENERATE_INFOPLIST_FILE='YES',
                   TEST_TARGET_NAME='NEVORA', LD_RUNPATH_SEARCH_PATHS='$(inherited) @executable_path/Frameworks @loader_path/Frameworks')

def phases(files, resources=()):
    builds = [add('PBXBuildFile', fileRef=reference) for reference in files]
    return [add('PBXSourcesBuildPhase', buildActionMask=2147483647, files=builds, runOnlyForDeploymentPostprocessing=0),
            add('PBXFrameworksBuildPhase', buildActionMask=2147483647, files=[], runOnlyForDeploymentPostprocessing=0),
            add('PBXResourcesBuildPhase', buildActionMask=2147483647, files=[add('PBXBuildFile', fileRef=reference) for reference in resources], runOnlyForDeploymentPostprocessing=0)]

app = add('PBXNativeTarget', name='NEVORA', productName='NEVORA', productReference=app_product,
          productType='com.apple.product-type.application', buildConfigurationList=configurations(app_settings),
          buildPhases=phases(references, app_resources), buildRules=[], dependencies=[])
ui = add('PBXNativeTarget', name='NevoraUITests', productName='NevoraUITests', productReference=ui_product,
         productType='com.apple.product-type.bundle.ui-testing', buildConfigurationList=configurations(ui_settings),
         buildPhases=phases([ui_reference]), buildRules=[], dependencies=[])
project = add('PBXProject', attributes={'BuildIndependentTargetsInParallel': 'YES', 'LastUpgradeCheck': '2700',
              'TargetAttributes': {app: {'CreatedOnToolsVersion': '27.0'}, ui: {'CreatedOnToolsVersion': '27.0', 'TestTargetID': app}}},
              buildConfigurationList=configurations(dict(CLANG_ENABLE_MODULES='YES', CLANG_ENABLE_OBJC_ARC='YES')),
              compatibilityVersion='Xcode 14.0', developmentRegion='en', hasScannedForEncodings=0,
              knownRegions=['en', 'Base'], mainGroup=group, productRefGroup=products,
              projectDirPath='', projectRoot='', targets=[app, ui])
proxy = add('PBXContainerItemProxy', containerPortal=project, proxyType=1, remoteGlobalIDString=app, remoteInfo='NEVORA')
dependency = add('PBXTargetDependency', target=app, targetProxy=proxy)
objects[ui]['dependencies'] = [dependency]

def encode(value, level=0):
    if isinstance(value, dict):
        return '{\n' + ''.join('\t'*(level+1) + json.dumps(key) + ' = ' + encode(item, level+1) + ';\n' for key, item in value.items()) + '\t'*level + '}'
    if isinstance(value, list):
        return '(' + ', '.join(encode(item, level+1) for item in value) + ')'
    return json.dumps(value)

project_dir = root / 'NEVORA.xcodeproj'
project_dir.mkdir(exist_ok=True)
(project_dir / 'project.pbxproj').write_text('// !$*UTF8*$!\n' + encode(dict(archiveVersion=1, classes={}, objectVersion=56, objects=objects, rootObject=project)) + '\n')
scheme_dir = project_dir / 'xcshareddata/xcschemes'
scheme_dir.mkdir(parents=True, exist_ok=True)
def ref(target, product, name):
    return f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="{product}" BlueprintName="{name}" ReferencedContainer="container:NEVORA.xcodeproj"/>'
app_ref = ref(app, 'NEVORA.app', 'NEVORA')
ui_ref = ref(ui, 'NevoraUITests.xctest', 'NevoraUITests')
(scheme_dir / 'NEVORA.xcscheme').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2700" version="1.7">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries>
<BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{app_ref}</BuildActionEntry>
</BuildActionEntries></BuildAction>
<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES">
<Testables><TestableReference skipped="NO">{ui_ref}</TestableReference></Testables></TestAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="NO"><BuildableProductRunnable runnableDebuggingMode="0">{app_ref}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{app_ref}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>\n''')
for name in ['Debug', 'Release']:
    info = {'CFBundleDevelopmentRegion': 'en', 'CFBundleExecutable': '$(EXECUTABLE_NAME)',
            'CFBundleIdentifier': '$(PRODUCT_BUNDLE_IDENTIFIER)', 'CFBundleInfoDictionaryVersion': '6.0',
            'CFBundleName': 'NEVORA', 'CFBundleDisplayName': 'NEVORA', 'CFBundlePackageType': 'APPL',
            'CFBundleShortVersionString': '$(MARKETING_VERSION)', 'CFBundleVersion': '$(CURRENT_PROJECT_VERSION)',
            'NEVORABackendOrigin': '$(NEVORA_BACKEND_ORIGIN)', 'NEVORANativePushEnabled': '$(NEVORA_NATIVE_PUSH_ENABLED)', 'NEVORANativePushEnvironment': '$(NEVORA_NATIVE_PUSH_ENVIRONMENT)', 'UILaunchScreen': {},
            'UIApplicationSceneManifest': {'UIApplicationSupportsMultipleScenes': False,
                'UISceneConfigurations': {'UIWindowSceneSessionRoleApplication': [{'UISceneConfigurationName': 'Default Configuration', 'UISceneDelegateClassName': '$(PRODUCT_MODULE_NAME).SceneDelegate'}]}},
            'UISupportedInterfaceOrientations': ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']}
    if name == 'Debug':
        info['NSAppTransportSecurity'] = {'NSAllowsLocalNetworking': True}
    directory = root / 'Configuration'
    directory.mkdir(exist_ok=True)
    (directory / f'{name}-Info.plist').write_bytes(plistlib.dumps(info))
print('Generated NEVORA.xcodeproj and explicit Debug/Release plists')
