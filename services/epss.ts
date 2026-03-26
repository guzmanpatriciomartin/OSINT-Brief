

const EPSS_API_URL = 'https://api.first.org/data/v1/epss?cve=';

export interface EpssScore {
  cve: string;
  epss: string;
  percentile: string;
  date: string;
}

export const fetchEpssScores = async (cveIds: string[]): Promise<Record<string, number>> => {
  if (!cveIds.length) return {};

  // API supports comma separated CVEs
  // Chunking to avoid URL length limits (approx 20 CVEs per call)
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < cveIds.length; i += chunkSize) {
    chunks.push(cveIds.slice(i, i + chunkSize));
  }

  const results: Record<string, number> = {};

  try {
    const promises = chunks.map(async (chunk) => {
      const url = `${EPSS_API_URL}${chunk.join(',')}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();
        if (json.data) {
          json.data.forEach((item: any) => {
            results[item.cve] = parseFloat(item.epss);
          });
        }
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error fetching EPSS scores:", error);
  }

  return results;
};