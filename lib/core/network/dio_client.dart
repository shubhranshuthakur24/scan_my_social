import 'package:dio/dio.dart';
import 'package:getx_starter/core/network/interceptors/auth_interceptor.dart';
import 'package:getx_starter/core/network/interceptors/error_interceptor.dart';
import 'package:getx_starter/core/network/interceptors/logging_interceptor.dart';

/// Central Dio factory.
///
/// Registered as a singleton in [InjectionContainer]:
/// ```dart
/// Get.put<Dio>(DioClient.create(), permanent: true);
/// ```
///
/// Inject it into any data source via:
/// ```dart
/// final dio = Get.find<Dio>();
/// ```
class DioClient {
  DioClient._(); // prevent instantiation

  /// Base URL — override per environment via constants or flavour config.
  static const _baseUrl = 'https://api.example.com/v1'; // 🔧 change me

  static const _connectTimeoutMs = 15000;
  static const _receiveTimeoutMs = 15000;

  /// Creates and returns a configured [Dio] instance with all interceptors.
  static Dio create() {
    final dio = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(milliseconds: _connectTimeoutMs),
        receiveTimeout: const Duration(milliseconds: _receiveTimeoutMs),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.addAll([
      AuthInterceptor(), // 1️⃣ inject Firebase token (or skip)
      ErrorInterceptor(), // 2️⃣ map DioException → domain Failure
      LoggingInterceptor(), // 3️⃣ log every request/response/error
    ]);

    return dio;
  }
}
