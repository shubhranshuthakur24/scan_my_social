/// Dart extension methods shared across the entire app.
///
/// Grouping extensions in [core/base/] keeps them discoverable and avoids
/// scattering one-off helpers throughout feature folders.
library;

// ── String extensions ────────────────────────────────────────────────────────

extension StringX on String {
  /// Returns `true` if the string matches a basic e-mail pattern.
  bool get isValidEmail => RegExp(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
  ).hasMatch(this);

  /// Returns `true` if the string has at least [minLength] characters.
  bool isMinLength(int minLength) => length >= minLength;

  /// Capitalises the first character of the string.
  String get capitalized =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';
}

// ── List extensions ──────────────────────────────────────────────────────────

extension ListX<T> on List<T> {
  /// Returns `null` instead of throwing if index is out-of-range.
  T? tryGet(int index) => (index >= 0 && index < length) ? this[index] : null;
}

// ── DateTime extensions ──────────────────────────────────────────────────────

extension DateTimeX on DateTime {
  /// e.g. "05 Mar 2026"
  String get formatted =>
      '${day.toString().padLeft(2, '0')} '
      '${_monthName(month)} '
      '$year';

  static String _monthName(int m) => const [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][m];
}
