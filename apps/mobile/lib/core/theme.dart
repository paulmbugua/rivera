import 'package:flutter/material.dart';

const riveraInk = Color(0xFF062F35);
const riveraGreen = Color(0xFF145347);
const riveraMint = Color(0xFF75B9A6);
const riveraGold = Color(0xFFF4B860);
const riveraCream = Color(0xFFF8F5ED);
const riveraPaper = Color(0xFFFFFDF8);
const riveraRose = Color(0xFFF1CEC3);

ThemeData riveraTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: riveraGreen,
    brightness: Brightness.light,
    primary: riveraGreen,
    secondary: riveraGold,
    surface: riveraPaper,
    error: const Color(0xFFB3261E),
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: riveraCream,
    fontFamily: 'Georgia',
    textTheme: const TextTheme(
      displaySmall: TextStyle(fontSize: 40, height: 1.05, color: riveraInk),
      headlineMedium: TextStyle(fontSize: 30, height: 1.1, color: riveraInk),
      titleLarge: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: riveraInk,
      ),
      bodyLarge: TextStyle(
        fontFamily: 'Arial',
        fontSize: 16,
        height: 1.45,
        color: riveraInk,
      ),
      bodyMedium: TextStyle(fontFamily: 'Arial', height: 1.4, color: riveraInk),
      labelLarge: TextStyle(fontFamily: 'Arial', fontWeight: FontWeight.w700),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: Color(0xFFD3DDD7)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: Color(0xFFD3DDD7)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: riveraGreen, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 17),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: riveraPaper,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFFDCE3DE)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(54),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        textStyle: const TextStyle(
          fontFamily: 'Arial',
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: riveraPaper,
      indicatorColor: Color(0xFFD8EBE5),
      labelTextStyle: WidgetStatePropertyAll(
        TextStyle(
          fontFamily: 'Arial',
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
  );
}
