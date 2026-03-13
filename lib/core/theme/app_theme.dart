import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Central theme configuration for the app.
///
/// Usage in [GetMaterialApp]:
/// ```dart
/// GetMaterialApp(
///   theme: AppTheme.light,
///   darkTheme: AppTheme.dark,
///   themeMode: ThemeMode.system,
/// )
/// ```
class AppTheme {
  AppTheme._();

  // ── Colour palette ───────────────────────────────────────────────────────────
  static const Color _primary = Color(0xFF4F46E5); // indigo-600
  static const Color _primaryDark = Color(0xFF6366F1); // indigo-500
  static const Color _surface = Color(0xFFF9FAFB);
  static const Color _surfaceDark = Color(0xFF1E1E2C);
  static const Color _error = Color(0xFFEF4444);

  // ── Light theme ──────────────────────────────────────────────────────────────
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: _primary,
      surface: _surface,
      error: _error,
    ),
    textTheme: GoogleFonts.interTextTheme(),
    scaffoldBackgroundColor: _surface,
    appBarTheme: const AppBarTheme(
      backgroundColor: _primary,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );

  // ── Dark theme ───────────────────────────────────────────────────────────────
  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: _primaryDark,
      brightness: Brightness.dark,
      surface: _surfaceDark,
      error: _error,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
    scaffoldBackgroundColor: _surfaceDark,
    appBarTheme: const AppBarTheme(
      backgroundColor: _surfaceDark,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _primaryDark,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );
}

/// Convenient [BuildContext] extensions for accessing theme tokens.
extension AppThemeX on BuildContext {
  ThemeData get theme => Theme.of(this);
  ColorScheme get colors => Theme.of(this).colorScheme;
  TextTheme get textTheme => Theme.of(this).textTheme;
}
