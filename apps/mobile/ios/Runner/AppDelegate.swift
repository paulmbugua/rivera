import Flutter
import Security
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    guard let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "RiveraSecureSession") else { return }
    let channel = FlutterMethodChannel(name: "rivera/secure-session", binaryMessenger: registrar.messenger())
    channel.setMethodCallHandler { call, result in
      let service = "com.paulmbugua.rivera.session"
      let account = "cookies"
      let base: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
      switch call.method {
      case "read":
        var query = base
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        result(status == errSecSuccess ? String(data: item as! Data, encoding: .utf8) : nil)
      case "write":
        guard let args = call.arguments as? [String: Any], let value = args["value"] as? String else { result(FlutterError(code: "INVALID_VALUE", message: "Session value is required", details: nil)); return }
        SecItemDelete(base as CFDictionary)
        var query = base
        query[kSecValueData as String] = value.data(using: .utf8)!
        result(SecItemAdd(query as CFDictionary, nil) == errSecSuccess ? nil : FlutterError(code: "KEYCHAIN_WRITE_FAILED", message: "Could not save the Rivera session", details: nil))
      case "delete":
        SecItemDelete(base as CFDictionary)
        result(nil)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }
}
