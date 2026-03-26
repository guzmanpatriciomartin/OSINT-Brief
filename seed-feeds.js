import mongoose from 'mongoose';

// Cadena de conexión extraída de tu server.js
const MONGO_URI = "mongodb+srv://joaquinscarrizo02_db_user:TFFUE8OLVOUdpsow@dbbrief.ul4p4gp.mongodb.net/?retryWrites=true&w=majority&appName=DBBrief";

// Definimos el esquema mínimo necesario para este script
const rssFeedSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true }
}, { timestamps: true });

const RssFeed = mongoose.models.RssFeed || mongoose.model('RssFeed', rssFeedSchema);

// Lista de Feeds a insertar
const feeds = [
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

const seedFeeds = async () => {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conexión exitosa.');

        let addedCount = 0;
        let updatedCount = 0;

        console.log('🚀 Iniciando carga de feeds...');

        for (const feed of feeds) {
            // Usamos updateOne con upsert: true.
            // Esto busca por URL. Si existe, actualiza (por si cambió el título). Si no existe, lo crea.
            const result = await RssFeed.updateOne(
                { url: feed.url },
                { $set: feed },
                { upsert: true }
            );

            if (result.upsertedCount > 0) {
                console.log(`➕ Agregado: ${feed.title}`);
                addedCount++;
            } else if (result.modifiedCount > 0) {
                console.log(`🔄 Actualizado: ${feed.title}`);
                updatedCount++;
            } else {
                console.log(`👌 Ya existe: ${feed.title}`);
            }
        }

        console.log(`\n=================================`);
        console.log(`RESUMEN DE OPERACIÓN`);
        console.log(`=================================`);
        console.log(`Nuevos agregados : ${addedCount}`);
        console.log(`Actualizados     : ${updatedCount}`);
        console.log(`Total procesados : ${feeds.length}`);
        console.log(`=================================\n`);

    } catch (error) {
        console.error('❌ Error ejecutando el script:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de la base de datos.');
        process.exit();
    }
};

seedFeeds();