import 'package:flutter/material.dart';

const riveraInk = Color(0xFF062F35);
const riveraGreen = Color(0xFF145347);
const riveraMint = Color(0xFF75B9A6);
const riveraGold = Color(0xFFF4B860);
const riveraCream = Color(0xFFF8F5ED);
const riveraPaper = Color(0xFFFFFDF8);
const riveraRose = Color(0xFFF1CEC3);

ThemeData riveraTheme([Brightness brightness = Brightness.light]) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: riveraGreen,
    brightness: brightness,
    primary: dark ? const Color(0xFF8BCDB7) : riveraGreen,
    secondary: riveraGold,
    surface: dark ? const Color(0xFF152522) : riveraPaper,
    error: const Color(0xFFB3261E),
  );
  final ink = dark ? const Color(0xFFECF4F0) : riveraInk;
  final surface = dark ? const Color(0xFF152522) : riveraPaper;
  final canvas = dark ? const Color(0xFF0E1917) : riveraCream;
  final line = dark ? const Color(0xFF344B45) : const Color(0xFFDCE3DE);
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: canvas,
    fontFamily: 'Arial',
    textTheme: TextTheme(
      displaySmall: TextStyle(
          fontSize: 30,
          height: 1.15,
          fontWeight: FontWeight.w700,
          letterSpacing: -.7,
          color: ink),
      headlineMedium: TextStyle(
          fontSize: 25,
          height: 1.2,
          fontWeight: FontWeight.w700,
          letterSpacing: -.5,
          color: ink),
      titleLarge: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: ink,
      ),
      bodyLarge: TextStyle(
        fontFamily: 'Arial',
        fontSize: 15,
        height: 1.45,
        color: ink,
      ),
      bodyMedium:
          TextStyle(fontFamily: 'Arial', fontSize: 14, height: 1.5, color: ink),
      labelLarge: const TextStyle(
        fontFamily: 'Arial',
        fontWeight: FontWeight.w700,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? const Color(0xFF1B2E2A) : Colors.white,
      hintStyle: TextStyle(
        color: dark ? const Color(0xFF91A69F) : const Color(0xFF71817B),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: scheme.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: line),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(
          fontFamily: 'Arial',
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: BorderSide(color: line),
      ),
    ),
    appBarTheme: AppBarTheme(
      toolbarHeight: 56,
      titleTextStyle: TextStyle(
          fontFamily: 'Arial',
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: ink),
      elevation: 0,
      centerTitle: false,
      backgroundColor: canvas,
      foregroundColor: ink,
      surfaceTintColor: Colors.transparent,
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 72,
      backgroundColor: surface,
      indicatorColor: dark ? const Color(0xFF294A41) : const Color(0xFFD8EBE5),
      labelTextStyle: const WidgetStatePropertyAll(
        TextStyle(
          fontFamily: 'Arial',
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    dividerColor: line,
  );
}
