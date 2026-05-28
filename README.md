# GymApp - Sistema POS para Gimnasios

Aplicación de escritorio para punto de venta (POS) y gestión integral de membresías para gimnasios.

## Descripción

GymPOS es una aplicación de escritorio completa diseñada para gimnasios que necesitan gestionar membresías, ventas de productos y seguimiento de miembros. Construida con Electron, React y TypeScript, ofrece una interfaz moderna y eficiente para el personal administrativo.

## Características Principales

### Dashboard
- Resumen de ventas del día (ingresos totales, número de transacciones)
- Contador de miembros activos
- Tarjetas de estadísticas rápidas
- Lista de transacciones recientes

### Gestión de Miembros
- Lista completa de miembros con búsqueda y filtros
- Agregar nuevos miembros (nombre, teléfono, email, tipo de membresía, fecha de inicio)
- Editar detalles de miembros
- Ver historial de cada miembro
- Estados: Activo, Expirado, Congelado

### Membresías
- Tipos de membresía predefinidos (Mensual, Trimestral, Anual)
- Configuración de precios por tipo
- Definición de duración en días

### Productos
- Catálogo de productos del gimnasio (suplementos, accesorios)
- Agregar/Editar/Eliminar productos
- Gestión de precios y cantidades en stock
- Categorías de productos

### Ventas/POS
- Búsqueda rápida de miembros (para renovación de membresías)
- Selección de productos
- Cálculo automático de totales
- Procesamiento de ventas (efectivo, tarjeta)
- Impresión de recibos (opcional)
- Historial de ventas diarias

### Almacenamiento de Datos
- Almacenamiento local en archivos JSON
- Ubicado en el directorio de datos del usuario
- Persistencia de datos entre sesiones

## Stack Tecnológico

- **Framework**: Electron v40.6.1
- **Frontend**: React v19.2.4
- **Lenguaje**: TypeScript v5.9.3
- **Build Tool**: Electron Vite v5.0.0
- **Estilos**: TailwindCSS v4.2.1
- **Tablas**: TanStack React Table v8.21.3
- **Empaquetado**: Electron Builder v26.8.1

## Requisitos Previos

- Node.js (versión 18 o superior recomendada)
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

### Generar Ejecutable para Windows

Para crear un ejecutable portable para Windows:

```bash
npm run build:win
```

El ejecutable se generará en la carpeta `release/`.

### Vista Previa

Para previsualizar la aplicación compilada:

```bash
npm run preview
```

## Estructura del Proyecto

```
gymapp/
├── src/
│   ├── main/          # Proceso principal de Electron
│   ├── preload/       # Scripts de preload
│   └── renderer/      # Aplicación React (UI)
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
| `npm run build:win` | Genera ejecutable portable para Windows |
| `npm run preview` | Previsualiza la aplicación compilada |

## Configuración

La aplicación almacena sus datos localmente en archivos JSON ubicados en el directorio de datos del usuario. No requiere configuración adicional para comenzar a usarla.

## Licencia

ISC

## Desarrollo

Para más detalles sobre la especificación del proyecto, consulta el archivo `SPEC.md`.
