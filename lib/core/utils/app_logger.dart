import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

/// A singleton logger that wraps the [Logger] package.
///
/// Usage anywhere in the app:
/// ```dart
/// AppLogger.info('User logged in', tag: 'LoginController');
/// AppLogger.warning('Retry attempt 2', tag: 'NetworkClient');
/// AppLogger.error('Auth failed', error: e, stackTrace: st, tag: 'AuthRepo');
/// AppLogger.debug('Payload: $data', tag: 'ApiService');
/// ```
///
/// All output is **silenced in release builds** automatically.
class AppLogger {
  AppLogger._(); // prevent instantiation

  static final Logger _logger = Logger(
    // PrettyPrinter gives coloured, emoji-annotated, multi-line output in debug.
    // In release mode the NullOutput filter suppresses everything.
    filter: kDebugMode ? DevelopmentFilter() : ProductionFilter(),
    printer: PrettyPrinter(
      methodCount: 2, // stack frames shown below each log
      errorMethodCount: 8, // extra frames for errors/wtf
      lineLength: 80,
      colors: true,
      printEmojis: true,
      dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
    ),
    output: ConsoleOutput(),
  );

  // ── Public API ─────────────────────────────────────────────────────────────

  /// 🐛 Verbose/trace-level detail — lowest severity.
  static void verbose(String message, {String? tag}) {
    _logger.t(_format(message, tag));
  }

  /// 🔍 Debug — useful during development.
  static void debug(String message, {String? tag}) {
    _logger.d(_format(message, tag));
  }

  /// ℹ️ Info — general lifecycle events (screen opened, request sent, etc.).
  static void info(String message, {String? tag}) {
    _logger.i(_format(message, tag));
  }

  /// ⚠️ Warning — something unexpected but not fatal.
  static void warning(String message, {String? tag, Object? error}) {
    _logger.w(_format(message, tag), error: error);
  }

  /// ❌ Error — something went wrong, optionally with the exception/stack.
  static void error(
    String message, {
    String? tag,
    Object? error,
    StackTrace? stackTrace,
  }) {
    _logger.e(_format(message, tag), error: error, stackTrace: stackTrace);
  }

  /// 💥 WTF — critical, should never happen.
  static void wtf(String message, {String? tag, Object? error}) {
    _logger.f(_format(message, tag), error: error);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  static String _format(String message, String? tag) =>
      tag != null ? '[$tag] $message' : message;
}
