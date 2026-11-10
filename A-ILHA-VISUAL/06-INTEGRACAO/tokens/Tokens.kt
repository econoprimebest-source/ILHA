package com.ailha.designsystem.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * A ILHA - DESIGN SYSTEM TOKENS PARA JETPACK COMPOSE
 * Mapeamento direto de tokens.json para desenvolvimento Android nativo.
 */
object IlhaTokens {
    // Cores Principais
    val BrandPrimary = Color(0xFF0EA5E9)
    val BrandSecondary = Color(0xFF6366F1)
    val BrandAccent = Color(0xFF00F0FF)

    // Distritos / Ambientes
    val DistrictWork = Color(0xFF0284C7)
    val DistrictWorkGlow = Color(0x730EA5E9)

    val DistrictPersonal = Color(0xFF10B981)
    val DistrictPersonalGlow = Color(0x7310B981)

    val DistrictFinance = Color(0xFFF59E0B)
    val DistrictFinanceGlow = Color(0x73F59E0B)

    val DistrictSandbox = Color(0xFF8B5CF6)
    val DistrictSandboxGlow = Color(0x738B5CF6)

    val DistrictExpansion = Color(0xFF06B6D4)

    // Status
    val StatusActive = Color(0xFF10B981)
    val StatusPaused = Color(0xFFF59E0B)
    val StatusDanger = Color(0xFFEF4444)

    // Superfícies (Tema Escuro)
    val DarkOcean = Color(0xFF04070E)
    val DarkBackground = Color(0xFF080C14)
    val DarkSurface = Color(0xFF141F36)
    val DarkCard = Color(0xB8121C30)

    // Espaçamentos
    val SpacingSm = 8.dp
    val SpacingMd = 16.dp
    val SpacingLg = 24.dp
    val SpacingXl = 32.dp

    // Raios de Borda
    val RadiusSm = 8.dp
    val RadiusMd = 12.dp
    val RadiusLg = 16.dp
    val RadiusXl = 24.dp
    val RadiusFull = 9999.dp
}
