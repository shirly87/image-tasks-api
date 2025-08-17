import express from 'express';
import router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

const app = express();

app.use(express.json());

app.use('/', router);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;