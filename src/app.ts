import express from 'express';
import router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { specs } from './docs/openapi.js';
import swaggerUi from 'swagger-ui-express';

const app = express();

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customSiteTitle: 'Image Processing API',
    customCss: '.swagger-ui .topbar { display: none }',
    explorer: true,
    swaggerOptions: { docExpansion: 'list' },
}));

app.get('/api-docs.json', (_req, res) => res.json(specs));

app.use('/', router);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;