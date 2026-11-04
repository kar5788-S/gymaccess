# DOCUMENTO DE ASEGURAMIENTO DE LA CALIDAD (QA) Y PRUEBAS
**Sistema:** GymAccess — Control de Acceso y Gestión de Gimnasio  
**Fase:** Sprint 4 — Reportes Avanzados, Notificaciones y Despliegue  
**Autor:** Karol Salvador Rodríguez González  
**Fecha:** Noviembre de 2026  

---

## 1. Ficha Técnica del Entorno de Pruebas
* **Frontend:** React + JavaScript (Vite - Localhost:5173)
* **Backend:** Node.js + Express (ES Modules - Localhost:3000)
* **Base de Datos:** MySQL Local (InnoDB, `utf8mb4`)
* **Metodología de QA:** Spec Kit / OpenCode Workflow (Pruebas y Aseguramiento Pre-Implementación)

---

## 2. Aclaraciones Técnicas y Gestión de Riesgos (`/speckit.clarify`)

> *Nota: Esta sección se completa tras ejecutar `/speckit.clarify` para registrar las decisiones tomadas ante ambigüedades técnicas.*

* **Decisión 1 (Formato de Reportes):** La generación de documentos PDF/Excel se manejará mediante librerías estándar en el backend/frontend sin crear archivos temporales persistentes en el disco del servidor.
* **Decisión 2 (Filtros de Notificaciones):** Las alertas visuales de vencimiento considerarán únicamente las membresías activas cuya fecha de fin sea menor o igual a 5 días respecto a la fecha actual (`DATEDIFF(fecha_fin, CURDATE()) <= 5`).
* **Decisión 3 (Rendimiento de Consultas):** Se implementaron índices explícitos en MySQL para la tabla `accesos` (`fecha_hora`) y `pagos` (`fecha_pago`) para mantener los tiempos de respuesta por debajo de los 200 ms.

---

## 3. Matriz de Aseguramiento de Calidad y Pruebas

| ID | Requisito / Historia | Criterio de Aceptación (EARS) | Prueba Ejecutada | Resultado | Evidencia / Defecto |
|---|---|---|---|---|---|
| **RF-01** | Reporte Financiero de Ingresos | CUANDO el administrador filtra un rango de fechas y solicita el reporte financiero, EL SISTEMA DEBE calcular el total recaudado desglosado por tipo de membresía y método de pago. | Se seleccionó el rango de fechas en la interfaz de React y se envió la petición a la API de backend para calcular ingresos. | Cumple ✓ | Ver Evidencia 1 |
| **RF-02** | Exportación de Reportes (PDF/Excel) | CUANDO el administrador pulsa el botón "Exportar PDF", EL SISTEMA DEBE generar y descargar un documento formateado con los totales correspondientes. | Se ejecutó la descarga del reporte financiero en formato PDF desde el navegador web. | Cumple ✓ | Ver Evidencia 2 |
| **RF-03** | Notificación de Membresías por Vencer | CUANDO el usuario autorizados ingresa al panel principal, EL SISTEMA DEBE listar y destacar las membresías que vencerán en 5 días o menos. | Se verificó en el panel de notificaciones el listado de clientes en estado crítico de vencimiento. | Cumple ✓ | Ver Evidencia 3 |
| **RF-04** | Historial de Accesos y Concurrencia | CUANDO el administrador solicita el reporte de accesos, EL SISTEMA DEBE listar las entradas autorizadas y rechazadas con filtros por fecha. | Se filtró el historial de accesos por rango de fechas comprobando la presencia de motivos en accesos rechazados. | Cumple ✓ | Ver Evidencia 4 |
| **RF-05** | Restricción por Rol en Reportería | SI un usuario con rol de Entrenador o Recepcionista intenta acceder a reportes financieros, ENTONCES EL SISTEMA DEBE denegar el acceso (403). | Se inició sesión como Entrenador y se intentó consultar el endpoint financiero verificando el bloqueo de seguridad. | Cumple ✓ | Ver Evidencia 5 |

---

## 3. Checklist de QA Preventivo y Aclaraciones Técnicas (/speckit.clarify)

- [x] **Técnica de Exportación (PDF/CSV):** Se determinó que la generación de reportes descargables se realizará directamente en el cliente (frontend), evitando sobrecargar el servidor backend y eliminando la acumulación de archivos temporales.
- [x] **Criterio de Reporte Financiero:** El reporte mostrará el desglose de todos los registros de pago del periodo, pero el **total recaudado calculará únicamente los pagos en estado "confirmado"** para asegurar la fiabilidad de la auditoría financiera.
- [x] **Consolidación de Accesos por Hora Exacta:** El reporte de horas pico agrupará las asistencias por bloques de 1 hora exacta (ej. 08:00–09:00), identificando la franja de mayor afluencia.
- [x] **Matriz de Control de Acceso por Roles (RBAC):**
  - El **Administrador** posee acceso completo a reportes financieros, de accesos y alertas.
  - El **Recepcionista** mantiene la consulta operativa diaria y el panel de alertas de vencimientos, pero no accede a reportes consolidados ni financieros.
  - El **Entrenador** y el **Cliente** tienen denegado el acceso al panel global de alertas y a reportes de administración.
- [x] **Backend ES Modules:** Verificado que `backend/package.json` mantenga `"type": "module"` sin uso de CommonJS (`require`).
- [x] **Aislamiento de Secretos:** Configuración de `.env` verificada en `.gitignore`.
---

## 4. Checklist de QA Preventivo y Restricciones Técnicas (`/speckit.plan`)

- [x] **Backend ES Modules:** Verificado que `backend/package.json` mantenga `"type": "module"` y no se utilice CommonJS (`require`).
- [x] **Seguridad de BD:** Consultas parametrizadas en MySQL para evitar inyecciones SQL en los agregados de reportes.
- [x] **Arquitectura REST:** Frontend (React) sin comunicación directa a MySQL, consumo exclusivo mediante endpoints del backend.
- [x] **Protección de Datos:** Contraseñas hasheadas mediante `bcrypt`, autenticación JWT activa y cero exposición de descriptores biométricos en reportes.
- [x] **Aislamiento de Secretos:** Archivo `.env` en `.gitignore` y archivo `.env.example` actualizado con las variables de producción.

---

## 5. Secciones de Evidencias

### Evidencia 1: Reporte Financiero de Ingresos (RF-01)
*(Adjuntar aquí la captura de pantalla de la interfaz de React mostrando la consulta de ingresos desglosados)*

### Evidencia 2: Exportación de Reporte a PDF/Excel (RF-02)
*(Adjuntar aquí la captura de pantalla del archivo PDF o Excel descargado en el navegador)*

### Evidencia 3: Notificación de Membresías por Vencer (RF-03)
*(Adjuntar aquí la captura de pantalla del panel con las alertas de membresías en estado próximo a expirar)*

### Evidencia 4: Historial de Accesos y Concurrencia (RF-04)
*(Adjuntar aquí la captura de pantalla de la tabla de accesos con entradas autorizadas y rechazadas)*

### Evidencia 5: Restricción por Rol en Reportería Financiera (RF-05)
*(Adjuntar aquí la captura de pantalla intentando acceder como Entrenador y observando el bloqueo o badge de permiso denegado)*