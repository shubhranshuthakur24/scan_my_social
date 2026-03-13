import 'package:connectivity_plus/connectivity_plus.dart';

/// Abstract contract — keeps domain/data layers independent of the package.
abstract class NetworkInfo {
  /// Returns `true` when at least one working network interface is present.
  Future<bool> get isConnected;
}

/// Concrete implementation backed by [connectivity_plus].
///
/// Register in your [InjectionContainer]:
/// ```dart
/// Get.lazyPut<NetworkInfo>(() => NetworkInfoImpl(Connectivity()));
/// ```
class NetworkInfoImpl implements NetworkInfo {
  final Connectivity _connectivity;

  const NetworkInfoImpl(this._connectivity);

  @override
  Future<bool> get isConnected async {
    final results = await _connectivity.checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }
}
