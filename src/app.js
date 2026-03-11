require('dotenv').config();
const express = require('express');
const cors = require('cors');
const gamesRouter = require('./routes/games');
const authRouter = require('./auth/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/games', gamesRouter);
app.use('/api/auth', authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
