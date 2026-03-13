/// App-wide compile-time constants.
///
/// Centralising these here prevents magic strings from scattering across
/// the codebase and makes refactoring a single-file change.
class AppConstants {
  AppConstants._(); // non-instantiable

  // ── Assets ──────────────────────────────────────────────────────────────────
  static const String faceModelPath = 'assets/models/mobilefaenet.tflite';

  // ── Firestore collection names ───────────────────────────────────────────────
  static const String usersCollection = 'users';
  static const String faceEmbeddingsCollection = 'face_embeddings';

  // ── Network ──────────────────────────────────────────────────────────────────
  /// Default timeout for remote calls in seconds.
  static const int requestTimeoutSeconds = 30;

  // ── Face / ML ────────────────────────────────────────────────────────────────
  /// Dimension of the face embedding vector produced by the TFLite model.
  static const int embeddingDimension = 192;

  /// Cosine-similarity threshold above which two faces are considered a match.
  static const double faceMatchThreshold = 0.75;

  // ── Misc ─────────────────────────────────────────────────────────────────────
  static const String appName = 'GetX Starter';
}
