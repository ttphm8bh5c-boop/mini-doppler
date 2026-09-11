import SwiftUI
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
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences = preferences
        
        // 1. 使用 non-persistent data store (零持久化快取、Cookie 或本地儲存)
        config.websiteDataStore = WKWebsiteDataStore.nonPersistent()
        
        // 2. 徹底移除私有 WKWebView KVC 權限 (確保 100% 符合 App Store 審查標準)
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        
        // 3. 載入本地 WebAssets 資源
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "WebAssets") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}

    // 4. 本地 Navigation Allowlist 導航白名單防護
    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            
            // 僅允許讀取本地 App Bundle 內部的 file:// 資源，阻斷所有外鏈或未授權導航
            if url.isFileURL {
                let bundlePath = Bundle.main.bundlePath
                if url.path.hasPrefix(bundlePath) {
                    decisionHandler(.allow)
                    return
                }
            }
            
            // 阻擋所有其他未知或外部導航
            decisionHandler(.cancel)
        }
    }
}
