import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:getx_starter/core/utils/app_logger.dart';

/// Intercepts every outgoing request and optionally injects a Firebase
/// ID token as an [Authorization: Bearer] header.
///
/// **Opt-out per request** (token is injected by default):
/// ```dart
/// dio.get('/public', options: Options(extra: {'requiresAuth': false}));
/// ```
///
/// **Default (no extra needed) — token is injected automatically:**
/// ```dart
/// dio.get('/profile');
/// ```
class AuthInterceptor extends Interceptor {
  static const _tag = 'AuthInterceptor';

  /// Key used in [RequestOptions.extra] to control token injection.
  static const requiresAuthKey = 'requiresAuth';

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Default to true — protected endpoints are the common case.
    final requiresAuth = options.extra[requiresAuthKey] as bool? ?? true;

    if (!requiresAuth) {
      AppLogger.verbose(
        'Auth skipped for ${options.method} ${options.path}',
        tag: _tag,
      );
      return handler.next(options);
    }

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      AppLogger.warning(
        'requiresAuth=true but no user is signed in — skipping token injection',
        tag: _tag,
      );
      return handler.next(options);
    }

    try {
      final token = await user.getIdToken();
      options.headers['Authorization'] = 'Bearer $token';
      AppLogger.verbose(
        'Token injected for ${options.method} ${options.path}',
        tag: _tag,
      );
    } catch (e) {
      AppLogger.error('Failed to fetch ID token: $e', tag: _tag);
    }

    handler.next(options);
  }
}
