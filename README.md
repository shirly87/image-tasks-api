# Image Processing API

API REST para procesamiento de imágenes y gestión de tareas asíncronas, desarrollada con Node.js, TypeScript y Express.

## **Descripción del Proyecto**

Esta API permite crear tareas de procesamiento de imágenes que se ejecutan de forma asíncrona. Cada tarea genera variantes de la imagen original en resoluciones específicas (1024px y 800px de ancho, manteniendo el aspect ratio).

### **Características principales:**
- **Procesamiento asíncrono** de imágenes
- **Generación automática** de variantes en múltiples resoluciones
- **Sistema de precios** aleatorios para cada tarea
- **Persistencia** en MongoDB con índices optimizados
- **Manejo robusto de errores** centralizado
- **Documentación automática** con Swagger/OpenAPI
- **Suite de pruebas** completa (unitarias e integración)

## Decisiones clave
- **Procesamiento en background**: se responde 201 **rápido** y el resize corre en una cola.
- **Upscaling permitido**: se redimensiona a las resoluciones exactas (1024px, 800px) manteniendo aspect ratio.
- **Formato de salida**: se conserva (jpeg/png/webp…). No se convierte.
- **Auto-recuperación**: al arrancar se re-encolan tareas `pending`. (Mitiga cola en memoria).
- **Errores**:
  - HTTP: `errorHandler` devuelve `{ error: { code, message, statusCode, timestamp, path } }`.

## **Arquitectura del Sistema**

### **Estructura de directorios:**
```
src/
├── bootstrap/       # Re-encola tareas `pending` al arrancar el servidor
├── config/          # Configuración de BD y entorno
├── controllers/     # Controladores de la API
├── docs/            # Documentación OpenAPI/Swagger
├── errors/          # Manejo centralizado de errores
├── jobs/            # Sistema de cola de trabajos
├── middleware/      # Middlewares de Express
├── models/          # Modelos de MongoDB
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── app.ts           # Configuración de Express
└── server.ts        # Punto de entrada del servidor

tests/
├── integration/     # Pruebas de integración
├── models/          # Pruebas unitarias de modelos
├── setup.ts         # Configuración global de pruebas
└── utils/           # Utilidades para pruebas
```

### **Patrones arquitectónicos:**
- **API-First Design**: Diseño centrado en la API con documentación Swagger/OpenAPI
- **Separation of Concerns**: Separación clara de responsabilidades en capas (controllers, services, models, routes, middleware)
- **Queue Pattern**: Cola de trabajos en memoria para procesamiento asíncrono con control de concurrencia
- **Direct Model Access**: Acceso directo a modelos Mongoose desde servicios y controladores

## **Tecnologías Utilizadas**

### **Backend:**
- **Node.js 22**: Runtime de JavaScript
- **TypeScript**: Tipado estático
- **Express.js**: Framework web
- **MongoDB**: Base de datos NoSQL
- **Mongoose**: ODM para MongoDB
- **Sharp**: Procesamiento de imágenes

### **Testing:**
- **Vitest**: Framework de pruebas
- **Supertest**: Testing de APIs HTTP
- **MongoDB Memory Server**: BD en memoria para pruebas

### **Documentación:**
- **Swagger/OpenAPI**: Documentación automática de la API
- **JSDoc**: Documentación en código

## **Instalación y Configuración**

### **Prerrequisitos:**
- Node.js 22 o superior
- MongoDB (local)
- npm o yarn

### **1. Clonar el repositorio:**
```bash
git clone <repository-url>
cd image-tasks-api
```

### **2. Instalar dependencias:**
```bash
npm install
```

### **3. Configurar variables de entorno:**
Crear archivo `.env` en la raíz del proyecto:
```env
MONGODB_URI=mongodb://localhost:27017/image-tasks
PORT=4000
NODE_ENV=development
```

### **4. Iniciar MongoDB:**
```bash
# Local
brew services start mongodb/brew/mongodb-community
```

### **5. Ejecutar la aplicación:**
```bash
# Desarrollo con hot reload
npm run dev

# Compilar TypeScript
npm run build

# Iniciar en producción
npm start

# Inicializar base de datos con datos de ejemplo
npm run init-db
```

## **Uso de la API**

### **Documentación interactiva:**
Accede a la documentación completa en: `http://localhost:4000/api-docs`

### **Endpoints disponibles:**
- **GET /v1** - Información de versión de la API
- **POST /tasks** - Crear nueva tarea de procesamiento
- **GET /tasks/:taskId** - Consultar estado de tarea

### **Endpoints principales:**

#### **GET /v1**
Obtiene la versión de la API.

**Response (200):**
```json
{
  "version": "Image Tasks API 1.0.0"
}
```

#### **POST /tasks**
Crea una nueva tarea de procesamiento de imagen.

**Request:**
```json
{
  "imageSource": "/path/to/image.jpg"
}
```

**Response (201):**
```json
{
  "taskId": "65d4a54b89c5e342b2c2c5f6",
  "status": "pending",
  "price": 25.5
}
```

#### **GET /tasks/:taskId**
Obtiene el estado y detalles de una tarea con imagenes si esta completada.

**Response (200):**
```json
{
  "taskId": "65d4a54b89c5e342b2c2c5f6",
  "status": "completed",
  "price": 25.5,
  "images": [
    {
      "resolution": "1024",
      "path": "/output/image1/1024/f322b730b287da77e1c519c7ffef4fc2.jpg"
    },
    {
      "resolution": "800",
      "path": "/output/image1/800/202fd8b3174a774bac24428e8cb230a1.jpg"
    }
  ]
}
```

## 🧪 **Ejecución de Pruebas**

### **Ejecutar todas las pruebas:**
```bash
npm test
```

### **Ejecutar pruebas específicas:**
```bash
# Solo pruebas de integración
npm test -- tests/integration/

# Solo tests de modelos (Task unitario + Image integración)
npm test -- tests/models/

# Solo tests unitarios (Task)
npm test -- tests/models/Task.test.ts

# Solo tests de integración de modelos (Image)
npm test -- tests/models/Image.test.ts
```

### **Cobertura de pruebas:**
- **Tests unitarios**: Lógica pura del modelo Task (generateRandomPrice)
- **Tests de modelos**: Validación de schemas, validaciones y persistencia en MongoDB (Image model)
- **Tests de integración**: Endpoints de la API y flujo completo de tareas

### **Decisiones de testing:**
- **Race conditions**: Los tests de flujo completo aceptan tanto `pending` como `completed` en verificaciones inmediatas para evitar fallos por concurrencia entre la creación de tareas y el procesamiento en background

## 🔍 **Manejo de Errores**

### **Códigos de error estandarizados:**
- **INVALID_INPUT**: Datos de entrada inválidos
- **NOT_FOUND**: Recurso no encontrado
- **INTERNAL_ERROR**: Error interno del servidor
- **METHOD_NOT_ALLOWED**: Método HTTP no permitido

### **Respuestas de error consistentes:**
```json
{
  "error": {
    "message": "Descripción del error",
    "code": "INVALID_INPUT",
    "statusCode": 400,
    "timestamp": "2025-08-18T20:38:10.984Z",
    "path": "/tasks"
  }
}
```

## **Base de Datos**

### **Colecciones principales:**

#### **Tasks:**
- `_id`: ObjectId único
- `status`: Estado de la tarea (pending/completed/failed)
- `price`: Precio asignado (5-50 unidades)
- `originalPath`: Ruta de la imagen original (path local o URL)
- `images`: Array de imágenes procesadas
- `error`: Mensaje de error (si falló)
- `createdAt`: Timestamp de creación
- `updatedAt`: Timestamp de última actualización

#### **Images:**
- `_id`: ObjectId único
- `path`: Ruta del archivo procesado
- `resolution`: Resolución de la imagen
- `md5`: Hash MD5 del archivo
- `createdAt`: Timestamp de creación

### **Optimizaciones de base de datos:**
- **Índices optimizados** para consultas frecuentes
- **Consultas eficientes** con `lean()` para mejor rendimiento

## **Sistema de Cola de Trabajos**

### **Características:**
- **Procesamiento asíncrono**: No bloquea la API
- **Concurrencia limitada**: Máximo 2 trabajos simultáneos
- **Recuperación automática**: Re-encola tareas pendientes al reiniciar
- **Manejo de errores**: Captura y logea errores de trabajos fallidos

### **Flujo de trabajo:**
1. **API recibe** solicitud de creación
2. **Tarea se crea** en estado "pending"
3. **Se responde inmediatamente** con taskId
4. **Tarea se encola** para procesamiento
5. **Worker procesa** la imagen en background
6. **Estado se actualiza** a "completed" o "failed"

---

