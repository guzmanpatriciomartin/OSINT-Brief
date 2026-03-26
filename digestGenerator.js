// digestGenerator.js
import Parser from 'rss-parser';

const parser = new Parser();

/**
 * Verifica si una fecha está dentro del rango [startDate, endDate].
 * @param {Date} date - La fecha a verificar.
 * @param {Date} start - La fecha de inicio del rango.
 * @param {Date} end - La fecha de fin del rango.
 * @returns {boolean} True si la fecha está dentro del rango, false en caso contrario.
 */
function isWithinRange(date, start, end) {
  return date >= start && date <= end;
}

/**
 * Intenta parsear una cadena de fecha en un objeto Date, manejando múltiples formatos.
 * Utiliza el constructor nativo de Date para la mayoría de los casos y una limpieza básica como fallback.
 * @param {string} dateString - La cadena de fecha a parsear.
 * @returns {Date|null} Un objeto Date si el parseo es exitoso, de lo contrario null.
 */
function parseDate(dateString) {
  if (!dateString) return null;

  // Intentar con el constructor Date nativo primero, ya que es el más flexible para formatos estándar
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Si falla, probar eliminando partes de zona horaria comunes para que Date lo intente de nuevo
  const cleanedString = dateString.replace(/(\sGMT|\s[A-Z]{3,4})$/, '').trim();
  date = new Date(cleanedString);
  if (!isNaN(date.getTime())) {
      return date;
  }

  // Si todo lo demás falla, devolver null
  return null;
}

/**
 * Genera un digest de noticias de ciberseguridad como un array de objetos JSON.
 * @param {Array} feeds - Array de objetos feed { title, url }.
 * @param {Date} startDate - Fecha de inicio para filtrar noticias.
 * @param {Date} endDate - Fecha de fin para filtrar noticias.
 * @returns {Promise<Array<Object>>} Una promesa que resuelve con un array de objetos de noticias.
 */
export async function generateDigestData(feeds, startDate, endDate) {
  let allItems = [];

  // Parallelize feed fetching for better performance
  const feedPromises = feeds.map(async (feed) => {
    try {
      console.log(`[DIGEST] Procesando fuente: ${feed.title}`);
      
      // Add timeout to prevent hanging on bad feeds
      const parsedFeed = await parser.parseURL(feed.url);

      const filteredItems = parsedFeed.items
        .filter(item => {
          const pubDate = parseDate(item.pubDate || item.isoDate);
          if (!pubDate) {
            return false;
          }
          return isWithinRange(pubDate, startDate, endDate);
        })
        .map(item => ({
          title: item.title,
          link: item.link,
          pubDate: (parseDate(item.pubDate || item.isoDate) || new Date()).toISOString(),
          feedTitle: feed.title,
          description: item.contentSnippet || item.description || '' 
        }));

      return filteredItems;
    } catch (error) {
      console.error(`[DIGEST] Error al obtener la fuente ${feed.title}: ${error.message}`);
      return [];
    }
  });

  const results = await Promise.all(feedPromises);
  
  // Flatten array
  results.forEach(items => {
    allItems.push(...items);
  });

  // Sort by date descending
  allItems.sort((a, b) => {
    const dateA = new Date(a.pubDate);
    const dateB = new Date(b.pubDate);
    return dateB.getTime() - dateA.getTime();
  });

  if (allItems.length === 0) {
    console.log("[DIGEST] No se encontraron artículos en el rango de fechas especificado.");
  } else {
    console.log(`[DIGEST] Procesamiento completado. Total de artículos: ${allItems.length}`);
  }

  return allItems;
}