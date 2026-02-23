require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const path        = require('path');
const { initDb }  = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',   require('./routes/auth'));
app.use('/api/logins', require('./routes/logins'));
app.use('/api/cards',  require('./routes/cards'));
app.use('/api/banks',  require('./routes/banks'));

// Serve the SPA for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SecureVault running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialise database:', err.message);
    process.exit(1);
  });
