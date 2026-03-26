
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import path from 'url';
import { fileURLToPath } from 'url';
import pathModule from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateDigestData } from './digestGenerator.js';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

const MONGO_URI = "mongodb+srv://joaquinscarrizo02_db_user:TFFUE8OLVOUdpsow@dbbrief.ul4p4gp.mongodb.net/?retryWrites=true&w=majority&appName=DBBrief";
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const JWT_EXPIRATION_TIME = '1h';

let ai = null;
if (process.env.API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (error) {
    console.error('❌ Error al inicializar Google Gemini:', error.message);
  }
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected successfully');
    await seedInitialFeeds();
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use(cors());
app.use(bodyParser.json());

const FE_DIST_PATH = pathModule.join(__dirname, 'dist');
app.use(express.static(FE_DIST_PATH));

const toJSONConfig = {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
};

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
}, { timestamps: true });
userSchema.set('toJSON', toJSONConfig);

const incidenteSchema = new mongoose.Schema({ fecha: { type: Date, required: true }, tipo: String, entidad: String, pais: String, sector: String, descripcion: String, datosComprometidos: String, actor: String, url: String }, { timestamps: true });
incidenteSchema.set('toJSON', toJSONConfig);

const exploitSchema = new mongoose.Schema({ fecha: { type: Date, required: true }, nombre: String, tipo: String, plataforma: String, cve: String, url: String }, { timestamps: true });
exploitSchema.set('toJSON', toJSONConfig);

const zeroDaySchema = new mongoose.Schema({ idZD: String, fecha: { type: Date, required: true }, nombre: String, plataforma: String, cvss: Number, estado: String, url: String, descripcion: String }, { timestamps: true });
zeroDaySchema.set('toJSON', toJSONConfig);

const alertaSchema = new mongoose.Schema({ titulo: String, descripcion: String, criticidad: String, fecha: { type: Date, required: true }, url: String }, { timestamps: true });
alertaSchema.set('toJSON', toJSONConfig);

const fuenteSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    fecha: { type: Date, required: true },
    tipo: String,
    url: String,
    descripcion: String
}, { timestamps: true });
fuenteSchema.set('toJSON', toJSONConfig);

const mitigacionSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    fecha: { type: Date, required: true },
    categoria: String,
    prioridad: String,
    descripcion: String,
    url: String
}, { timestamps: true });
mitigacionSchema.set('toJSON', toJSONConfig);

const cveSchema = new mongoose.Schema({
    cveId: { type: String, required: true, uppercase: true, trim: true, unique: true },
    fecha: { type: Date, required: true },
    aplicativo: String,
    cvss: Number,
    estado: String,
    descripcion: String,
    url: String
}, { timestamps: true });
cveSchema.set('toJSON', toJSONConfig);

const riskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  customers: [String],
  tags: [String],
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  description: String,
  status: { type: String, enum: ['detectado', 'notificado', 'mitigando', 'resuelto', 'riesgo-aceptado'], default: 'detectado' },
  createdAt: { type: Number, default: () => Date.now() },
  lastUpdated: { type: Number, default: () => Date.now() },
  activity: [{
    type: { type: String, enum: ['comment', 'status_change'] },
    timestamp: Number,
    text: String,
    status: String,
    comment: String,
    username: String 
  }]
});
riskSchema.set('toJSON', toJSONConfig);

const rssFeedSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true }
}, { timestamps: true });
rssFeedSchema.set('toJSON', toJSONConfig);

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Incidente = mongoose.models.Incidente || mongoose.model('Incidente', incidenteSchema);
const Exploit = mongoose.models.Exploit || mongoose.model('Exploit', exploitSchema);
const ZeroDay = mongoose.models.ZeroDay || mongoose.model('ZeroDay', zeroDaySchema);
const Alerta = mongoose.models.Alerta || mongoose.model('Alerta', alertaSchema);
const Fuente = mongoose.models.Fuente || mongoose.model('Fuente', fuenteSchema);
const Mitigacion = mongoose.models.Mitigacion || mongoose.model('Mitigacion', mitigacionSchema);
const Cve = mongoose.models.Cve || mongoose.model('Cve', cveSchema);
const Risk = mongoose.models.Risk || mongoose.model('Risk', riskSchema);
const RssFeed = mongoose.models.RssFeed || mongoose.model('RssFeed', rssFeedSchema);

async function seedInitialFeeds() {
    try {
        const count = await RssFeed.countDocuments();
        if (count === 0) {
            const initialFeeds = [
                { title: "Graham Cluley", url: "https://grahamcluley.com/feed/" },
                { title: "Schneier on Security", url: "https://www.schneier.com/tag/cybersecurity/feed/" },
                { title: "KrebsOnSecurity", url: "https://krebsonsecurity.com/feed/" },
                { title: "CSO Online", url: "https://www.csoonline.com/feed/" },
                { title: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
                { title: "We Live Security (ESET)", url: "https://www.welivesecurity.com/en/rss/feed/" },
                { title: "Sophos News", url: "https://news.sophos.com/en-us/feed/" },
                { title: "Cyberbuilders Substack", url: "https://cyberbuilders.substack.com/feed" },
                { title: "The Hacker News", url:"https://feeds.feedburner.com/TheHackersNews" },
                { title: "Zero Day Initiative", url:"https://www.zerodayinitiative.com/rss/published/"   },
                { title: "Daily dark web", url: "https://dailydarkweb.net/feed/"},
                { title: "Kev", url:"https://kevfeed.vercel.app/CISA-KEV.xml"},
                { title: "Trendmicro", url: "https://newsroom.trendmicro.com/news-releases?pagetemplate=rss"},
                { title: "Splunk", url: "https://advisory.splunk.com/feed.xml"},
                { title: "Incibe", url: "https://www.incibe.es/feed/vulnerabilities"},
                { title: "Splotius", url: "https://sploitus.com/rss"}
            ];
            await RssFeed.insertMany(initialFeeds);
        }
    } catch (error) { console.error('Error seeding feeds:', error); }
}

const apiRouter = express.Router(); 
const protectedApiRouter = express.Router(); 

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (token == null) return res.status(401).json({ message: 'Authentication token required.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token.' });
        req.user = user; 
        next();
    });
};

protectedApiRouter.use(authenticateToken);

const createCrudRoutesFor = (modelName, model) => {
    const router = express.Router();
    router.get('/', async (req, res) => { try { const sortKey = model.schema.path('fecha') ? { fecha: -1 } : { createdAt: -1 }; const items = await model.find().sort(sortKey); res.status(200).json(items); } catch (err) { res.status(500).json({ message: `Error`, error: err.message }); } });
    router.get('/:id', async (req, res) => { try { const item = await model.findById(req.params.id); if (!item) return res.status(404).json({ message: 'Not found' }); res.status(200).json(item); } catch (err) { res.status(500).json({ message: `Error`, error: err.message }); } });
    router.post('/', async (req, res) => { try { const newItem = new model(req.body); const savedItem = await newItem.save(); res.status(201).json(savedItem); } catch (err) { res.status(400).json({ message: `Error`, error: err.message }); } });
    router.put('/:id', async (req, res) => { try { const updatedItem = await model.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.status(200).json(updatedItem); } catch (err) { res.status(400).json({ message: `Error`, error: err.message }); } });
    router.delete('/:id', async (req, res) => { try { await model.findByIdAndDelete(req.params.id); res.status(204).send(); } catch (err) { res.status(500).json({ message: `Error`, error: err.message }); } });
    return router;
};

// --- SCRAPING SERVICE ---
protectedApiRouter.post('/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: "URL is required" });
    try {
        const response = await axios.get(url, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
            },
            timeout: 12000
        });
        const $ = cheerio.load(response.data);
        
        // Remove noise
        $('script, style, nav, footer, iframe, header, noscript, .sidebar, .comments, .ads').remove();
        
        let content = '';
        
        // Try to find the most relevant container
        const selectors = ['article', 'main', '.post-content', '.entry-content', '.article-body', '.content', 'body'];
        let found = false;
        
        for (const selector of selectors) {
          const el = $(selector);
          if (el.length > 0 && el.text().trim().length > 300) {
            content = el.text().replace(/\s+/g, ' ').trim();
            found = true;
            break;
          }
        }
        
        if (!found) {
          content = $('p').map((_, el) => $(el).text()).get().join('\n').replace(/\s+/g, ' ').trim();
        }

        res.json({ content: content.substring(0, 15000) });
    } catch (error) {
        console.error("Scrape Error:", error.message);
        res.status(500).json({ message: "No se pudo extraer el contenido de la fuente", error: error.message });
    }
});

apiRouter.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10); 
        const newUser = new User({ username, passwordHash });
        await newUser.save();
        res.status(201).json({ message: 'User registered' });
    } catch (err) { res.status(500).json({ message: 'Error', error: err.message }); }
});

apiRouter.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRATION_TIME });
        res.status(200).json({ token, username: user.username });
    } catch (err) { res.status(500).json({ message: 'Error', error: err.message }); }
});

apiRouter.use('/rss-feeds', createCrudRoutesFor('rss-feeds', RssFeed));
apiRouter.get('/digest', async (req, res) => {
    try {
        const days = parseInt(req.query.days, 10) || 7;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        const feeds = await RssFeed.find({});
        const digestItems = await generateDigestData(feeds, startDate, endDate);
        res.json(digestItems);
    } catch (error) { res.status(500).json({ error: "Error digest", details: error.message }); }
});

protectedApiRouter.use('/incidentes', createCrudRoutesFor('incidentes', Incidente));
protectedApiRouter.use('/exploits', createCrudRoutesFor('exploits', Exploit));
protectedApiRouter.use('/zerodays', createCrudRoutesFor('zerodays', ZeroDay));
protectedApiRouter.use('/alertas', createCrudRoutesFor('alertas', Alerta));
protectedApiRouter.use('/fuentes', createCrudRoutesFor('fuentes', Fuente));
protectedApiRouter.use('/mitigaciones', createCrudRoutesFor('mitigaciones', Mitigacion));
protectedApiRouter.use('/riesgos', createCrudRoutesFor('riesgos', Risk));
protectedApiRouter.use('/cves', createCrudRoutesFor('cves', Cve));

protectedApiRouter.post('/ai/analyze', async (req, res) => {
    try {
        if (!ai) return res.status(503).json({ message: "IA no disponible" });
        const { query } = req.body;
        const [incidents, risks] = await Promise.all([Incidente.find().limit(5), Risk.find().limit(5)]);
        const prompt = `Analista CTI: ${query}. Contexto: ${JSON.stringify({ incidents, risks })}`;
        const result = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
        res.json({ response: result.text });
    } catch (error) { res.status(500).json({ message: "Error", error: error.message }); }
});

apiRouter.use('/', protectedApiRouter);
app.use('/api', apiRouter);

app.get(/.*/, (req, res) => { res.sendFile(pathModule.resolve(FE_DIST_PATH, 'index.html')); });
app.listen(PORT, () => console.log(`✅ Server on http://localhost:${PORT}`));
