# GymApp - Sistema POS para Gimnasios

Aplicación de escritorio para punto de venta (POS) y gestión integral de membresías para gimnasios.

## Descripción

GymPOS es una aplicación de escritorio completa diseñada para gimnasios que necesitan gestionar membresías, ventas de productos y seguimiento de miembros. Construida con Electron, React y TypeScript, ofrece una interfaz moderna y eficiente para el personal administrativo.

## Características Principales

### Dashboard
- Ventas y transacciones del día, miembros activos y total de miembros
- Ventas recientes y calendario de vencimientos del mes
- **Asistencia Semanal**: tabla por persona y por día (lunes a domingo) con la hora de entrada, cuántas personas vinieron cada día y cuántos días vino cada persona; se puede navegar entre semanas

### Miembros
- Cada miembro tiene un **código** numérico (desde 1001) para el check-in
- Búsqueda por nombre, código, teléfono o email (sin importar acentos ni mayúsculas)
- Estado calculado por la fecha de vencimiento: Activo, Expirado o Congelado
- **Credencial** imprimible con código de barras (Code 39) que se puede escanear en el check-in
- **Tarjeta NFC**: con el botón **NFC** se vincula una tarjeta al miembro acercándola al lector; desde ahí también se reemplaza o se desvincula. Cada tarjeta solo puede estar vinculada a un miembro, y no puede ser igual al código de otro miembro.
- **Historial** por miembro: asistencias, membresías compradas y compras de productos
- **Congelar / Descongelar**: al descongelar, el vencimiento se recorre los días que estuvo congelado

### Membresías y Venta de Membresías
- Tipos de membresía con precio, duración en días y promociones
- Venta de membresías a uno o varios miembros (por ejemplo, pareja), que renueva su vencimiento

### Productos, Ventas e Inventario
- Catálogo de productos con categoría, precio y stock
- Punto de venta en efectivo o tarjeta; no deja vender más unidades de las que hay en stock
- **Historial de Ventas** por día: productos, membresías, total y lo cobrado en efectivo
- Entradas de inventario que suman al stock

### Check-In y Asistencias
La app tiene dos ventanas que corren en paralelo al sistema y se abren desde el menú lateral (**Ventanas**) o desde el menú **Ventana**:

- **Check-In (kiosco)**: para los miembros. Acercan su tarjeta NFC, escanean su credencial o escriben su código, teléfono o email, y la app los deja pasar o les dice por qué no. No muestra datos de otros miembros ni permite abrir otras ventanas.
- **Recepción**: para el personal. Busca a cualquier miembro, registra su entrada con un clic (o Enter con el código, o acercando su tarjeta NFC) y muestra en vivo las entradas del día.

**Lector NFC**: la app funciona con lectores USB que se comportan como teclado (los más comunes para control de acceso): al acercar la tarjeta escriben su número de serie y presionan Enter. No necesitan drivers en Windows ni en macOS. Basta con que el cursor esté en el campo del Check-In, de la Recepción o de la ventana de vincular tarjeta. Los lectores PC/SC, como el ACR122U, no escriben como teclado y no son compatibles por ahora.

Las dos ventanas aplican las mismas reglas: no entran miembros congelados ni con la membresía vencida, y una entrada repetida dentro de 2 minutos no se vuelve a registrar. Todo lo que registran aparece al momento en la Recepción, en la página **Asistencias** y en el Dashboard.

### Importar y Exportar (Configuración)
- **Exportar** un respaldo completo en JSON e **importarlo** después: solo se agregan los registros que todavía no existen, así que importar el mismo respaldo dos veces no duplica nada.
- **Importar CSV** de miembros, productos o membresías:
  - Acepta archivos de Excel en español: separador `;` o `,`, números como `1.300,50` o `1,300.50`, fechas `AAAA-MM-DD` o `DD/MM/AAAA` y valores `VERDADERO`/`sí`.
  - Encabezados en inglés o en español (`name`/`nombre`, `phone`/`teléfono`, `enddate`/`vencimiento`, `price`/`precio`…). Para miembros, la columna `nfc` o `tarjeta` vincula su tarjeta NFC.
  - Omite los registros que ya existen y muestra avisos de los valores que no pudo interpretar.

### Almacenamiento de Datos
- Los datos se guardan en `gym-pos-data.json`, dentro de la carpeta de datos de la app en el directorio del usuario (en Mac, dentro de `~/Library/Application Support/`; en Windows, dentro de `%APPDATA%`). La ruta exacta queda en el registro de la app al iniciar.
- Cada guardado escribe primero un archivo temporal y luego lo reemplaza, para que un apagón no deje el archivo a medias. La versión anterior queda en `gym-pos-data.json.bak`.
- Si al abrir la app el archivo está dañado, se mueve a `gym-pos-data.corrupt-<fecha>.json`, se restaura el `.bak` y aparece un aviso.

## Stack Tecnológico

- **Framework**: Electron v40.6.1
- **Frontend**: React v19.2.4
- **Lenguaje**: TypeScript v5.9.3
- **Build Tool**: Electron Vite v5.0.0
- **Estilos**: TailwindCSS v4.2.1
- **Tablas**: TanStack React Table v8.21.3
- **Empaquetado**: Electron Builder v26.8.1

## Requisitos Previos

- Node.js 22 (la versión que usa el CI)
- npm (viene incluido con Node.js)

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/dahlanGale/GymApp.git
cd gymapp
```

2. Instala las dependencias:
```bash
npm install
```

## Ejecución

### Modo Desarrollo

Para ejecutar la aplicación en modo desarrollo con hot-reload:

```bash
npm run dev
```

### Compilar la Aplicación

Para compilar el código fuente:

```bash
npm run build
```

### Generar Instalador para Windows

Para crear el instalador de Windows (se instala para el usuario actual, sin pedir permisos de administrador):

```bash
npm run build:win
```

El instalador (`GymPOS Setup <versión>.exe`) se generará en la carpeta `release/`.

### Generar Instalador para macOS

Desde una Mac, para crear los instaladores `.dmg` (Apple Silicon e Intel):

```bash
npm run build:mac
```

Los instaladores se generan en la carpeta `release/`.

#### Abrir la app en macOS por primera vez

La app no está firmada ni notarizada con un certificado de Apple, así que macOS avisa que no pudo comprobar que no tenga software malicioso. Desde macOS Sequoia (15) ya no funciona el clic derecho → **Abrir**; hay que desbloquearla así:

1. Copia GymPOS a **Aplicaciones**, intenta abrirla y pulsa **Listo** en el aviso.
2. Ve a **Ajustes del Sistema → Privacidad y seguridad** y, en la sección **Seguridad**, pulsa **Abrir igualmente** junto al mensaje de GymPOS. Confirma con tu contraseña o Touch ID.
3. Vuelve a abrir la app y elige **Abrir igualmente**.

El botón solo aparece un rato después del intento; si no lo ves, repite el paso 1. También se puede quitar la marca de descarga desde la Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/GymPOS.app
```

Para que abra sin avisos hace falta firmarla con un certificado **Developer ID** y notarizarla (Apple Developer Program).

### Instaladores desde GitHub

- **Versiones publicadas**: la página [Releases](https://github.com/dahlanGale/GymApp/releases) tiene los instaladores de cada versión para Windows y macOS.
- **Versiones de prueba**: en cada PR, el CI genera la app para Windows y macOS. Los instaladores se pueden descargar durante 7 días desde la ejecución del workflow **CI** en la pestaña **Actions**, en la sección **Artifacts**.

## Actualizaciones Automáticas

La app revisa al abrir, y luego cada 4 horas, si hay una versión nueva publicada en Releases. Los datos del gimnasio no se tocan al actualizar.

- **Windows**: descarga la versión nueva en segundo plano y la instala al cerrar la app, o al pulsar **Reiniciar y actualizar** en el aviso que aparece arriba.
- **macOS**: muestra un aviso con el botón **Descargar**, que abre la página de la versión nueva. La actualización no se instala sola porque macOS lo impide en apps sin firma **Developer ID** de Apple.

La versión instalada se ve abajo en el menú lateral.

### Publicar una Versión Nueva

1. Sube el número de versión en `package.json` (por ejemplo, de `1.1.0` a `1.2.0`) y fusiona ese cambio en `main`.
2. Crea y sube la etiqueta con el mismo número:

```bash
git tag v1.2.0
git push origin v1.2.0
```

El workflow **Release** genera los instaladores de Windows y macOS y los publica en Releases. Si la etiqueta no coincide con la versión de `package.json`, el workflow se detiene sin publicar nada.

### Vista Previa

Para previsualizar la aplicación compilada:

```bash
npm run preview
```

## Estructura del Proyecto

```
gymapp/
├── .github/workflows/ # CI (tipos y empaquetado en cada PR) y Release (publicar versiones)
├── src/
│   ├── main/          # Proceso principal de Electron (datos, ventanas, importación CSV)
│   ├── preload/       # Preloads: ventana principal, kiosco de Check-In y Recepción
│   ├── renderer/      # Aplicación React (UI) de las tres ventanas
│   └── shared/        # Tipos y utilidades usados por main, preload y renderer
├── out/               # Código compilado
├── release/           # Ejecutables generados
├── package.json       # Dependencias y scripts
├── electron.vite.config.ts  # Configuración de Vite
├── tsconfig.json      # Configuración de TypeScript
├── SPEC.md           # Especificación detallada del proyecto
└── README.md         # Este archivo
```

## Diseño Visual

### Paleta de Colores
- **Primario**: #2563EB (Azul)
- **Secundario**: #1E293B (Gris Oscuro)
- **Acento**: #10B981 (Verde Esmeralda)
- **Fondo**: #F8FAFC
- **Superficie**: #FFFFFF
- **Peligro**: #EF4444
- **Advertencia**: #F59E0B

### Tipografía
- **Familia**: Inter, system-ui, sans-serif
- **Encabezados**: 24px (h1), 20px (h2), 16px (h3)
- **Cuerpo**: 14px
- **Pequeño**: 12px

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia la aplicación en modo desarrollo |
| `npm run build` | Compila el código fuente |
| `npm run build:win` | Genera el instalador para Windows |
| `npm run build:mac` | Genera instaladores `.dmg` para macOS (Apple Silicon e Intel) |
| `npm run preview` | Previsualiza la aplicación compilada |
| `npm run typecheck` | Revisa los tipos de TypeScript (lo mismo que corre el CI) |

## Configuración

No requiere configuración adicional para comenzar a usarla. Los datos del gimnasio (nombre, dirección, teléfono, email y costo de mantenimiento anual) se editan en **Configuración**.

## Licencia

ISC

## Desarrollo

Para más detalles sobre la especificación del proyecto, consulta el archivo `SPEC.md`.
