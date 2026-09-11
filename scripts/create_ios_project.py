#!/usr/bin/env python3
import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IOS_DIR = os.path.join(BASE_DIR, "ios")
PROJECT_DIR = os.path.join(IOS_DIR, "FetalDoppler")
XCODEPROJ_DIR = os.path.join(IOS_DIR, "FetalDoppler.xcodeproj")
WEB_ASSETS_DIR = os.path.join(PROJECT_DIR, "WebAssets")
ASSETS_DIR = os.path.join(PROJECT_DIR, "Assets.xcassets")

# Create directories
os.makedirs(WEB_ASSETS_DIR, exist_ok=True)
os.makedirs(XCODEPROJ_DIR, exist_ok=True)
os.makedirs(os.path.join(ASSETS_DIR, "AppIcon.appiconset"), exist_ok=True)
os.makedirs(os.path.join(ASSETS_DIR, "AccentColor.colorset"), exist_ok=True)

# 1. Copy WebAssets
shutil.copy2(os.path.join(BASE_DIR, "index.html"), os.path.join(WEB_ASSETS_DIR, "index.html"))
shutil.copy2(os.path.join(BASE_DIR, "styles.css"), os.path.join(WEB_ASSETS_DIR, "styles.css"))
shutil.copy2(os.path.join(BASE_DIR, "app.bundle.js"), os.path.join(WEB_ASSETS_DIR, "app.bundle.js"))

# 2. Write Info.plist
info_plist = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>胎兒CPR計算器</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<false/>
	</dict>
	<key>UILaunchScreen</key>
	<dict/>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
</dict>
</plist>
"""
with open(os.path.join(PROJECT_DIR, "Info.plist"), "w") as f:
    f.write(info_plist)

# 3. Write App Entry (FetalDopplerApp.swift)
app_swift = """import SwiftUI

@main
struct FetalDopplerApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
"""
with open(os.path.join(PROJECT_DIR, "FetalDopplerApp.swift"), "w") as f:
    f.write(app_swift)

# 4. Write ContentView.swift (SwiftUI + WKWebView Container)
content_swift = """import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        ZStack {
            Color(UIColor.systemGroupedBackground)
                .ignoresSafeArea()
            
            WebViewContainer()
                .ignoresSafeArea(.keyboard, edges: .bottom)
        }
    }
}

struct WebViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences = preferences
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "WebAssets") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
"""
with open(os.path.join(PROJECT_DIR, "ContentView.swift"), "w") as f:
    f.write(content_swift)

# 5. Write Asset Contents.json
appicon_json = """{
  "images" : [
    {
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
"""
with open(os.path.join(ASSETS_DIR, "AppIcon.appiconset", "Contents.json"), "w") as f:
    f.write(appicon_json)

accent_json = """{
  "colors" : [
    {
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
"""
with open(os.path.join(ASSETS_DIR, "AccentColor.colorset", "Contents.json"), "w") as f:
    f.write(accent_json)

# 6. Generate project.pbxproj
pbxproj = """// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {

/* Begin PBXBuildFile section */
		1001 /* FetalDopplerApp.swift in Sources */ = {isa = PBXBuildFile; fileRef = 2001 /* FetalDopplerApp.swift */; };
		1002 /* ContentView.swift in Sources */ = {isa = PBXBuildFile; fileRef = 2002 /* ContentView.swift */; };
		1003 /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = 2003 /* Assets.xcassets */; };
		1004 /* WebAssets in Resources */ = {isa = PBXBuildFile; fileRef = 2004 /* WebAssets */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		0001 /* FetalDoppler.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = FetalDoppler.app; sourceTree = BUILT_PRODUCTS_DIR; };
		2001 /* FetalDopplerApp.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = FetalDopplerApp.swift; sourceTree = "<group>"; };
		2002 /* ContentView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ContentView.swift; sourceTree = "<group>"; };
		2003 /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };
		2004 /* WebAssets */ = {isa = PBXFileReference; lastKnownFileType = folder; path = WebAssets; sourceTree = "<group>"; };
		2005 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		4001 /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		3001 = {
			isa = PBXGroup;
			children = (
				3002 /* FetalDoppler */,
				3003 /* Products */,
			);
			sourceTree = "<group>";
		};
		3002 /* FetalDoppler */ = {
			isa = PBXGroup;
			children = (
				2001 /* FetalDopplerApp.swift */,
				2002 /* ContentView.swift */,
				2004 /* WebAssets */,
				2003 /* Assets.xcassets */,
				2005 /* Info.plist */,
			);
			path = FetalDoppler;
			sourceTree = "<group>";
		};
		3003 /* Products */ = {
			isa = PBXGroup;
			children = (
				0001 /* FetalDoppler.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		5001 /* FetalDoppler */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 6001 /* Build configuration list for PBXNativeTarget "FetalDoppler" */;
			buildPhases = (
				4002 /* Sources */,
				4001 /* Frameworks */,
				4003 /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = FetalDoppler;
			productName = FetalDoppler;
			productReference = 0001 /* FetalDoppler.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		0000 /* Project object */ = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1500;
				LastUpgradeCheck = 1500;
				TargetAttributes = {
					5001 = {
						CreatedOnToolsVersion = 15.0;
					};
				};
			};
			buildConfigurationList = 6002 /* Build configuration list for PBXProject "FetalDoppler" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = 3001;
			productRefGroup = 3003 /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				5001 /* FetalDoppler */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		4003 /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1003 /* Assets.xcassets in Resources */,
				1004 /* WebAssets in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		4002 /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1001 /* FetalDopplerApp.swift in Sources */,
				1002 /* ContentView.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		7001 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				ENABLE_PREVIEWS = YES;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = FetalDoppler/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 16.0;
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = "com.eddylo.fetaldoppler";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		7002 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				ENABLE_PREVIEWS = YES;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = FetalDoppler/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 16.0;
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = "com.eddylo.fetaldoppler";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
		7003 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_TESTABILITY = YES;
				GCC_DYNAMIC_NO_PIC = NO;
				GCC_OPTIMIZATION_LEVEL = 0;
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"$(inherited)",
				);
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				MTL_FAST_MATH = YES;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		7004 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_OPTIMIZATION_LEVEL = s;
				MTL_ENABLE_DEBUG_INFO = NO;
				MTL_FAST_MATH = YES;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
				VALIDATE_PRODUCT = YES;
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		6001 /* Build configuration list for PBXNativeTarget "FetalDoppler" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				7001 /* Debug */,
				7002 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		6002 /* Build configuration list for PBXProject "FetalDoppler" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				7003 /* Debug */,
				7004 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */

	};
	rootObject = 0000 /* Project object */;
}
"""

with open(os.path.join(XCODEPROJ_DIR, "project.pbxproj"), "w") as f:
    f.write(pbxproj)

print("Successfully created Xcode project at:", XCODEPROJ_DIR)
