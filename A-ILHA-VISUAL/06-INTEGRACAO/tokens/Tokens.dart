import 'package:flutter/material.dart';

/// A ILHA - DESIGN SYSTEM TOKENS PARA FLUTTER
abstract class IlhaTokens {
  // Brand
  static const Color brandPrimary = Color(0xFF0EA5E9);
  static const Color brandSecondary = Color(0xFF6366F1);
  static const Color brandAccent = Color(0xFF00F0FF);

  // Distritos
  static const Color distWork = Color(0xFF0284C7);
  static const Color distPersonal = Color(0xFF10B981);
  static const Color distFinance = Color(0xFFF59E0B);
  static const Color distSandbox = Color(0xFF8B5CF6);
  static const Color distExpansion = Color(0xFF06B6D4);

  // Status
  static const Color statusActive = Color(0xFF10B981);
  static const Color statusPaused = Color(0xFFF59E0B);
  static const Color statusDanger = Color(0xFFEF4444);

  // Superfícies Escuras
  static const Color darkOcean = Color(0xFF04070E);
  static const Color darkBg = Color(0xFF080C14);
  static const Color darkSurface = Color(0xFF141F36);
  static const Color darkCard = Color(0xB8121C30);

  // Raios
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 24.0;
  static const double radiusFull = 9999.0;
}
