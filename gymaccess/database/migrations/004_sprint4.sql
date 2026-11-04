-- =====================================================================
-- Migración 004: Sprint 4 — reportes avanzados, alertas de vencimiento
-- y preparación para despliegue
-- Sistema de Gestión para Gimnasio
-- Reglas: motor InnoDB, codificación utf8mb4, consultas desde la
-- aplicación siempre parametrizadas. Sin tablas nuevas y sin seeds.
-- Data model: specs/004-reportes-notificaciones-despliegue/data-model.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cambios en tablas existentes
-- ---------------------------------------------------------------------

-- Pagos: estado del pago para el total recaudado del reporte financiero
-- (FR-001, aclaración Q5 del 2026-11-04; research R-39). Las filas
-- existentes reciben 'confirmado' por el valor por defecto: no se altera
-- la información previa (FR-019). El reporte lista todos los pagos con
-- su estado y suma al total únicamente los confirmados.
ALTER TABLE pagos
  ADD COLUMN estado ENUM('confirmado','pendiente','anulado') NOT NULL
    DEFAULT 'confirmado';

-- Índices de filtrado frecuente exigidos por RN-S4-04 (research R-43):
-- rango de fechas y estado para el reporte financiero.
ALTER TABLE pagos
  ADD INDEX idx_pagos_fecha (fecha_pago),
  ADD INDEX idx_pagos_estado (estado);

-- Membresías: filtro de activas y rango de vencimiento del panel de
-- alertas de 5 días (RN-S4-02; la columna real es fecha_vencimiento,
-- que el insumo nombra fecha_fin).
ALTER TABLE membresias
  ADD INDEX idx_membresias_estado (estado),
  ADD INDEX idx_membresias_vencimiento (fecha_vencimiento);

-- Accesos: el insumo pide un índice sobre fecha_hora; la tabla guarda
-- fecha (DATE) y hora (TIME) por separado, por lo que el índice
-- compuesto equivale al pedido y soporta rangos y agrupación por hora
-- del reporte de accesos (FR-005). idx_accesos_fecha se conserva como
-- prefijo del compuesto.
ALTER TABLE accesos
  ADD INDEX idx_accesos_fecha_hora (fecha, hora);

-- Rostros: la validación facial lista los descriptores activos; el
-- índice sobre estado sostiene el objetivo de < 200 ms (FR-015,
-- RN-S4-04). Ya existen uq_rostros_cliente (PK/UNIQUE por cliente).
ALTER TABLE rostros
  ADD INDEX idx_rostros_estado (estado);

-- Las claves foráneas cliente_id ya están indexadas en clientes,
-- pagos, membresias, accesos y rostros (uq_rostros_cliente), y
-- auditoria ya tiene idx_auditoria_fecha/usuario/modulo: RN-S4-04
-- queda satisfecho sin índices adicionales.
