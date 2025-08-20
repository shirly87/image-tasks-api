import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Image Processing API',
      version: '1.0.0',
      description: 'API REST para procesamiento de imágenes y gestión de tareas'
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Servidor de desarrollo en local'
      }
    ],
    components: {
      schemas: {
        Task: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'ID único de la tarea',
              example: '65d4a54b89c5e342b2c2c5f6'
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed'],
              description: 'Estado actual de la tarea',
              example: 'pending'
            },
            price: {
              type: 'number',
              description: 'Precio asignado a la tarea',
              example: 35.75
            },
            images: {
              type: 'array',
              description: 'Detalles de las imágenes procesadas (solo si status es completed)',
              items: {
                $ref: '#/components/schemas/ImageReference'
              },
              example: [
                {
                  resolution: '1024',
                  path: '/output/image1/1024/f322b730b287da77e1c519c7ffef4fc2.jpg'
                },
                {
                  resolution: '800',
                  path: '/output/image1/800/202fd8b3174a774bac24428e8cb230a1.jpg'
                }
              ]
            }
          },
          required: ['taskId', 'status', 'price']
        },
        ImageReference: {
          type: 'object',
          properties: {
            resolution: {
              type: 'string',
              description: 'Resolución de la imagen (800 o 1024)'
            },
            path: {
              type: 'string',
              description: 'Ruta del archivo de imagen procesada',
              example: '/output/image1/1024/f322b730b287da77e1c519c7ffef4fc2.jpg'
            }
          }
        },
        CreateTaskRequest: {
          type: 'object',
          required: ['imageSource'],
          properties: {
            imageSource: { 
              type: 'string', 
              description: 'Ruta local de la imagen o URL (http/https) de la imagen a procesar',
              example: '/path/to/image.jpg o https://example.com/image.jpg'
            }
          }
        },
        CreateTaskResponse: {
          type: 'object',
          properties: { 
            taskId: { type: 'string',  description: 'ID de la tarea creada' },
            status: { type: 'string', enum: ['pending'], description: 'Estado inicial de la tarea' },
            price: { type: 'number', minimum: 5, maximum: 50, description: 'Precio asignado a la tarea' }
          }
        },
        GetTaskResponse: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID de la tarea' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed'], description: 'Estado actual de la tarea' },
            price: { type: 'number', minimum: 5, maximum: 50, description: 'Precio de la tarea' },
            images: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ImageReference'
              },
              description: 'Solo presente cuando status=completed. Cada item es una variante generada.'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Mensaje de error descriptivo',
                  example: 'Invalid taskId format'
                },
                code: {
                  type: 'string',
                  description: 'Código de error estandarizado',
                  enum: ['INVALID_INPUT', 'NOT_FOUND', 'INTERNAL_ERROR', 'METHOD_NOT_ALLOWED'],
                  example: 'INVALID_INPUT'
                },
                statusCode: {
                  type: 'number',
                  description: 'Código de estado HTTP',
                  enum: [400, 404, 500],
                  example: 400
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Timestamp del error',
                  example: '2025-08-18T20:38:10.984Z'
                },
                path: {
                  type: 'string',
                  description: 'Ruta de la API que originó el error',
                  example: '/tasks/invalid-id'
                }
              },
              required: ['message', 'code', 'statusCode', 'timestamp', 'path']
            }
          },
          required: ['error']
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const specs = swaggerJSDoc(options);
