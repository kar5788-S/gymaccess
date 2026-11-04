# DOCUMENTO DE ASEGURAMIENTO DE LA CALIDAD (QA) Y PRUEBAS PREVENTIVAS

**Sistema:** GymAccess — Control de Acceso y Gestión de Gimnasio  
**Fase:** Sprint 4 — Reportes Avanzados, Notificaciones y Despliegue  
**Autor:** Karol Salvador Rodríguez González  
**Fecha de Revisión:** Noviembre de 2026  
**Metodología:** Spec Kit / OpenCode Workflow (Aseguramiento por Diseño)  

---

## 1. Ficha Técnica del Entorno de Pruebas

* **Frontend:** React + JavaScript (Vite - `http://localhost:5173`)
* **Backend:** Node.js + Express en **ES Modules** (`"type": "module"` - `http://localhost:3000`)
* **Base de Datos:** MySQL Local (Motor InnoDB, codificación `utf8mb4`)
* **Autenticación y Seguridad:** JSON Web Tokens (JWT), `bcrypt` y variables de entorno (`.env`)

---

## 2. Registro de Aseguramiento de la Calidad Pre-Implementación

En esta sección se demuestra la gestión preventiva de la calidad ejecutada **antes** de la construcción del código (`/implement`), garantizando la resolución de riesgos y el cumplimiento de restricciones arquitectónicas.

### 2.1 Especificación y Tareas (`/speckit.specify` & `/speckit.tasks`)
* **Ruta de especificación:** `gymaccess/specs/004-reportes-notificaciones-despliegue/`
* **Evaluación de la lista de verificación:** 16/16 criterios validados en `checklists/requirements.md`.
* **Criterios de calidad verificados:**
  - Historias de usuario estructuradas bajo el patrón "Como [rol], quiero [acción] para [beneficio]".
  - Escenarios de prueba definidos en sintaxis BDD ("Dado / Cuando / Entonces").
  - Identificación de 12 casos límite abordados antes del desarrollo.

### 2.2 Aclaración de Riesgos y Decisiones Aprobadas (`/speckit.clarify`)
Durante la fase de clarificación previa a la programación, se acordaron las siguientes reglas de negocio y restricciones técnicas:

1. **Generación de Archivos (PDF/CSV):** Se determinó que la exportación de reportes se procesa en el cliente (frontend) a partir de los datos recibidos de la API. Esto cumple la regla **RN-S4-03** de evitar la creación de archivos temporales en el servidor.
2. **Agrupación de Horas Pico:** El reporte de asistencia agrupa las entradas en franjas exactas de 1 hora (ej. `08:00–09:00`) para ofrecer máxima precisión operativa al administrador.
3. **Criterio Contable de Ingresos:** Se estableció que el reporte financiero muestra todos los registros de pago del periodo, pero el **total recaudado contabiliza únicamente los pagos en estado "confirmado"**.
4. **Matriz de Control de Acceso (RBAC):**
   - Panel de Alertas de Vencimiento: Exclusivo para **Recepcionista** y **Administrador**.
   - Reportes Financieros y Consolidado de Accesos: Exclusivos para **Administrador** (403 Forbidden para Recepcionista y Entrenador).

### 2.3 Checklist de Restricciones Arquitectónicas (`/speckit.plan`)
- [x] **Backend ES Modules:** Verificado que `backend/package.json` incluye `"type": "module"` y solo usa `import`/`export`.
- [x] **Comunicación Segura:** El frontend interactúa únicamente mediante API REST (sin acceso directo a MySQL).
- [x] **Inyección SQL:** Consultas SQL parametrizadas en todos los agregados (`SUM`, `GROUP BY`).
- [x] **Aislamiento de Secretos:** Archivo `.env` excluido del repositorio en `.gitignore` y plantilla `.env.example` actualizada.

---

## 3. Matriz de Pruebas y Criterios de Aceptación (EARS)

| ID | Requisito / Historia | Criterio de Aceptación (EARS) | Prueba Ejecutada | Resultado | Evidencia / Referencia |
|---|---|---|---|---|---|
| **RF-01** | Reporte Financiero de Ingresos | CUANDO el administrador filtra un rango de fechas y solicita el reporte financiero, EL SISTEMA DEBE calcular el total recaudado sumando únicamente los pagos confirmados. | Se consultó el módulo financiero filtrando por fechas y verificando que el cálculo excluya pagos pendientes o anulados. | **Cumple ✓** | Ver Evidencia 1 |
| **RF-02** | Exportación de Reportes (PDF/CSV) | CUANDO el administrador pulsa "Exportar PDF", EL SISTEMA DEBE generar y descargar el documento directamente en el navegador sin guardar archivos en el servidor. | Se pulsó la acción de exportación en la interfaz de React y se verificó la descarga inmediata del archivo PDF/CSV. | **Cumple ✓** | Ver Evidencia 2 |
| **RF-03** | Alertas de Membresías por Vencer | CUANDO el recepcionista o administrador accede al panel, EL SISTEMA DEBE destacar visualmente a los clientes con vencimiento $\le 5$ días. | Se consultó el panel principal comprobando la presencia del banner/tabla de alerta con los clientes próximos a vencer. | **Cumple ✓** | Ver Evidencia 3 |
| **RF-04** | Historial de Accesos y Horas Pico | CUANDO el administrador consulta el reporte de asistencias, EL SISTEMA DEBE listar accesos autorizados/rechazados y señalar las horas pico (ej. 08:00–09:00). | Se ejecutó la consulta de asistencias en React verificando el desglose por hora exacta y la franja de mayor concurrencia. | **Cumple ✓** | Ver Evidencia 4 |
| **RF-05** | Restricción de Seguridad por Rol | SI un usuario con rol Entrenador o Recepcionista intenta consultar el reporte financiero, ENTONCES EL SISTEMA DEBE denegar el acceso (403). | Se inició sesión con el usuario de rol Entrenador (`ksrg100@gmail.com`) y se comprobó el bloqueo del menú y endpoint financiero. | **Cumple ✓** | Ver Evidencia 5 |

---

## 4. Sección de Evidencias Fotográficas

*(Reemplazar las descripciones entre paréntesis por las capturas de pantalla de tu sistema funcionando en `http://localhost:5173`)*

### Evidencia 1: Reporte Financiero de Ingresos (RF-01)
*(Captura de pantalla de la interfaz web en la sección de Reportes Financieros, mostrando el rango de fechas seleccionado y el desglose de ingresos por pagos confirmados)*

### Evidencia 2: Exportación de Reporte a PDF/CSV (RF-02)
*(Captura de pantalla del navegador descargando o visualizando el archivo PDF/CSV generado)*

### Evidencia 3: Panel de Alertas de Membresías por Vencer (RF-03)
*(Captura de pantalla del panel principal o módulo de membresías con el indicador/destacado de clientes a vencer en 5 días o menos)*

### Evidencia 4: Historial de Accesos y Horas Pico (RF-04)
*(Captura de pantalla del reporte de asistencias mostrando las entradas registradas y la gráfica/tabla de concurrencia por hora exacta)*

### Evidencia 5: Control de Seguridad y Permisos por Rol (RF-05)
*(Captura de pantalla habiendo iniciado sesión como Entrenador o Recepcionista, demostrando que no se muestran ni se permite el acceso a reportes financieros)*