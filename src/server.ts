import app from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT ?? 4000;

app.listen(PORT, () => {
    console.log(`Image Tasks API is running on port ${PORT} in ${env.NODE_ENV} mode`);
});