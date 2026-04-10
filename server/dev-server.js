import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const port = Number(process.env.API_PORT || 9998);

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(port, '0.0.0.0', () => {
  console.log(`[API] Listening on http://localhost:${port}`);
});
