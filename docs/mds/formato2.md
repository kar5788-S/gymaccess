# DOCUMENTO DE ASEGURAMIENTO DE LA CALIDAD (QA) Y PRUEBAS
**Sistema:** GymAccess — Control de Acceso y Gestión de Gimnasio  
**Fase:** Sprint 4 — Reportes Avanzados, Notificaciones y Despliegue  
**Autor:** Karol Salvador Rodríguez González  
**Fecha:** [Fecha actual]  

---

## 1. Ficha Técnica del Entorno de Pruebas
* **Frontend:** React + JavaScript (Vite - Localhost:5173)
* **Backend:** Node.js + Express (ES Modules - Localhost:3000)
* **Base de Datos:** MySQL Local (InnoDB, `utf8mb4`)
* **Metodología de QA:** Spec Kit / OpenCode Workflow (Pruebas y Aseguramiento Pre-Implementación)

---

## 2. Matriz de Aseguramiento de Calidad y Pruebas

| ID | Requisito | Criterio de Aceptación (EARS) | Prueba Ejecutada | Resultado | Evidencia / Defecto |
|---|---|---|---|---|---|
| **RF-01** | Exportación de Reportes Financieros | CUANDO el administrador filtra un rango de fechas y solicita exportación, EL SISTEMA DEBE generar un archivo descargable (PDF/Excel) con el resumen de ingresos. | Selección de rango de fechas en el módulo de reportes y descarga exitosa del archivo PDF/Excel. | Cumple ✓ | Ver Evidencia 1 |
| **RF-02** | Reporte de Asistencia y Accesos | CUANDO el usuario solicita el historial de accesos, EL SISTEMA DEBE listar las entradas autorizadas y rechazadas con su motivo. | Consulta de accesos por rango de fechas y verificación de registros de coincidencia facial. | Cumple ✓ | Ver Evidencia 2 |
| **RF-03** | Notificaciones de Vencimiento | CUANDO se ingresa al panel de membresías, EL SISTEMA DEBE calcular y listar las membresías por vencer en los próximos 5 días. | Verificación visual de alertas e indicadores de membresías en estado crítico. | Cumple ✓ | Ver Evidencia 3 |
| **RF-04** | Auditoría de Cambios Sensibles | CUANDO un usuario modifica un pago o una asignación de rutina, EL SISTEMA DEBE registrar la acción en la tabla `auditoria`. | Modificación de un registro y verificación del nuevo evento insertado en la tabla `auditoria` en MySQL. | Cumple ✓ | Ver Evidencia 4 |
| **RF-05** | Preparación de Entorno de Despliegue | SI el servidor se inicia en entorno de producción, ENTONCES EL SISTEMA DEBE validar la presencia de variables de entorno seguras sin exponer secretos en el repositorio. | Revisión de configuración de `.env.example`, `.gitignore` y verificación de variables de entorno. | Cumple ✓ | Ver Evidencia 5 |

---

## 3. Checklist de QA Preventivo y Restricciones Técnicas

- [x] **Backend ES Modules:** `backend/package.json` incluye `"type": "module"` y no se utiliza CommonJS (`require`).
- [x] **Seguridad de BD:** Consultas parametrizadas en MySQL para evitar inyecciones SQL.
- [x] **Arquitectura REST:** Frontend (React) sin comunicación directa a MySQL, consumo exclusivo mediante API REST.
- [x] **Protección de Datos:** Contraseñas hasheadas mediante `bcrypt` y tokens firmados con JWT.
- [x] **Aislamiento de Secretos:** Archivo `.env` en `.gitignore` y plantilla `.env.example` actualizada.

---

## 4. Evidencias de Funcionamiento

### Evidencia 1: Exportación de Reportes Financieros (RF-01)
*(Pegar aquí la captura de pantalla descargando el reporte PDF/Excel desde React)*

### Evidencia 2: Reporte de Asistencia y Accesos (RF-02)
*(Pegar aquí la captura de pantalla con la consulta de accesos en el sistema)*

### Evidencia 3: Notificaciones de Membresías por Vencer (RF-03)
*(Pegar aquí la captura de pantalla con la alerta visual de membresías en estado próximo a vencer)*

### Evidencia 4: Registro de Auditoría en Base de Datos (RF-04)
*(Pegar aquí la captura de pantalla de la tabla `auditoria` en MySQL o en el módulo de auditoría)*

### Evidencia 5: Configuración de Variables de Entorno para Despliegue (RF-05)
*(Pegar aquí la captura de pantalla del archivo `.env.example` y la estructura del proyecto lista para producción)*