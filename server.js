require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const mvpRoutes = require("./routes/mvp");
const convRoutes = require('./routes/conversations');
const chatRoutes = require('./routes/chat')
const app = express();
const PORT = process.env.PORT;


app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

const allowedOrigins = [
  "https://galuxium.com",
  "https://www.galuxium.com",
  "http://localhost:3000",
];
app.use(cors({
  origin: function(origin, cb) {
    
    if (!origin) return cb(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }
}));


app.use("/api/mvp", mvpRoutes);
app.use('/api/conversations', convRoutes);
app.use('/api/chat', chatRoutes);
const githubRoutes = require("./routes/githubRoutes");
app.use("/api/github", githubRoutes);
const vercelRoutes = require("./routes/vercelRoutes");
app.use("/api/vercel", vercelRoutes);
app.use("/api/orchestrator", require("./routes/orchestrator"));

app.use("/api/report",require("./routes/report_builder"));


app.get('/', (req, res) => {
  res.json({ ok: true, name: 'Galuxium Backend' });
});

app.listen(PORT, () => {
  console.log(`Galuxium backend listening on ${PORT}`);
});
