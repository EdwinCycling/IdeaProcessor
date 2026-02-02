import app from './app.js';

const PORT = process.env.PORT || 9998;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`- Analyze Endpoint: http://localhost:${PORT}/analyze`);
});
