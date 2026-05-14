/// App-wide compile-time constants.
///
/// Centralising these here prevents magic strings from scattering across
/// the codebase and makes refactoring a single-file change.
class AppConstants {
  AppConstants._(); // non-instantiable

  // ── Firestore collection names ───────────────────────────────────────────────
  static const String usersCollection = 'users';

  // ── Network ──────────────────────────────────────────────────────────────────
  /// Default timeout for remote calls in seconds.
  static const int requestTimeoutSeconds = 30;

  // ── Misc ─────────────────────────────────────────────────────────────────────
  static const String appName = 'GetX Starter';
}
