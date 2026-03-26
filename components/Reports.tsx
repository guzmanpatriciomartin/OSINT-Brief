
import React, { useState } from 'react';
import { FileText, Download, Upload, Mail, Loader2, Calendar, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTableModule from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { fetchResource, createResource } from '../services/api';

// Fix for autoTable in ESM environments
const autoTable = (autoTableModule as any).default || autoTableModule;

// Path to your background image
const BACKGROUND_IMAGE_PATH = '/assets/fondo.jpg'; 


export const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const RESOURCE_ENDPOINTS = {
    'incidentes': 'incidentes',
    'exploits': 'exploits',
    'zerodays': 'zerodays',
    'cves': 'cves',
    'alertas': 'alertas',
    'fuentes': 'fuentes',
    'mitigaciones': 'mitigaciones'
  };

  const fetchAllData = async (filterDate = true) => {
    const promises = Object.entries(RESOURCE_ENDPOINTS).map(async ([key, endpoint]) => {
      const data = await fetchResource<any>(endpoint);
      if (!filterDate || !startDate || !endDate) return { key, data };
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const filtered = data.filter((item: any) => {
        if (!item.fecha && !item.date) return false;
        const d = new Date(item.fecha || item.date);
        return d >= start && d <= end;
      });
      return { key, data: filtered };
    });

    const results = await Promise.all(promises);
    return results.reduce((acc, curr) => {
      acc[curr.key] = curr.data;
      return acc;
    }, {} as Record<string, any[]>);
  };

  const handlePdfExport = async () => {
    if (!startDate || !endDate) {
      alert('Por favor selecciona un rango de fechas.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
        return;
    }

    setLoading(true);
    setStatusMsg('Generando PDF...');
    
    try {
      const data = await fetchAllData(true);
      generateDetailedPDF(data, startDate, endDate);
      setStatusMsg('PDF generado correctamente.');
    } catch (e) {
      console.error(e);
      setStatusMsg('Error generando PDF.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no especificada';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  const getTopItems = (data: any[], key: string, count = 2) => {
    const counts = data.reduce((acc, item) => {
        const value = item[key];
        if (value && typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'desconocido') {
            acc[value.trim()] = (acc[value.trim()] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, count).map(e => e[0]);
  };

  const getSeverityTextForCVSS = (cvss: string | number) => {
    const score = parseFloat(String(cvss));
    if (isNaN(score)) return 'N/A';
    if (score >= 9.0) return 'Crítico';
    if (score >= 7.0) return 'Alto';
    if (score >= 4.0) return 'Medio';
    if (score > 0) return 'Bajo';
    return 'Info';
  };

  const generateDetailedPDF = (data: Record<string, any[]>, startDateStr: string, endDateStr: string) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 45;
    let yPos = 0;

    const COLOR_PRIMARY_PURPLE = '#6A3093';
    const COLOR_BLACK = '#1c1c1c';
    const COLOR_WHITE = '#FFFFFF';
    const COLOR_GREY_TEXT = '#333333';
    const COLOR_LIGHT_GREY_BG = '#F8F9FA';
    const COLOR_LINK = '#2574A9';

    const FONT_H1 = 22;
    const FONT_H2 = 14;
    const FONT_H3 = 11;
    const FONT_NORMAL = 10;
    const FONT_SMALL = 8;

    const autoTableOptions = {
        theme: 'striped',
        headStyles: { fillColor: COLOR_BLACK, textColor: COLOR_WHITE, fontSize: FONT_SMALL },
        styles: { fontSize: FONT_SMALL, cellPadding: 4, valign: 'middle' },
        margin: { left: margin, right: margin }
    };

    const checkAndAddPage = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - margin - 20) {
            doc.addPage();
            yPos = margin;
        }
    };

    const addPageFooter = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(FONT_SMALL);
            doc.setTextColor(COLOR_GREY_TEXT);
            const footerText = `Este reporte es clasificado como TLP:CLEAR (https://first.org/tlp/)`;
            doc.text(footerText, margin, pageHeight - 20);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
        }
    };

    const addSectionTitle = (title: string) => {
        checkAndAddPage(115);
        yPos += 20;
        doc.setFillColor(COLOR_PRIMARY_PURPLE);
        doc.rect(0, yPos, pageWidth, 25, 'F');
        doc.setFontSize(FONT_H2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLOR_WHITE);
        doc.text(title.toUpperCase(), margin, yPos + 17);
        yPos += 25 + 20;
    };

    const addIntroductoryText = (text: string) => {
        checkAndAddPage(60);
        doc.setFontSize(FONT_NORMAL);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_BLACK);
        const textLines = doc.splitTextToSize(text, pageWidth - margin * 2);
        doc.text(textLines, margin, yPos);
        yPos += doc.getTextDimensions(textLines).h + 20;
    };

    const addNoDataMessage = (message = 'No se registraron datos para esta sección en el período seleccionado.') => {
        checkAndAddPage(30);
        doc.setFontSize(FONT_NORMAL);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(COLOR_GREY_TEXT);
        doc.text(message, margin, yPos);
        yPos += 20;
    };

    const renderTextItem = (config: any) => {
        const availableWidth = pageWidth - margin * 2;
        checkAndAddPage(config.neededHeight || 80);
        doc.setFontSize(FONT_H3);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLOR_PRIMARY_PURPLE);
        const titleLines = doc.splitTextToSize(config.title, availableWidth);
        doc.text(titleLines, margin, yPos);
        yPos += doc.getTextDimensions(titleLines).h + 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_NORMAL);
        doc.setTextColor(COLOR_GREY_TEXT);

        config.details.forEach((detail: any) => {
            if (detail.value) {
                const detailText = detail.label + detail.value;
                const detailLines = doc.splitTextToSize(detailText, availableWidth);
                doc.text(detailLines, margin, yPos);
                yPos += doc.getTextDimensions(detailLines).h + 5;
            }
        });
        
        if (config.url) {
            yPos += 5;
            checkAndAddPage(15);
            doc.setTextColor(COLOR_LINK);
            doc.textWithLink('Visitar URL', margin, yPos, { url: config.url });
            doc.setTextColor(COLOR_GREY_TEXT);
            yPos += 15;
        }

        yPos += 5;

        if (config.description) {
            const descLines = doc.splitTextToSize(`${config.description}`, availableWidth);
            doc.text(descLines, margin, yPos);
            yPos += doc.getTextDimensions(descLines).h;
        }

        yPos += 25;
    };

    const drawMetricsCards = (startY: number) => {
        const metrics = [
            { label: 'Incidentes', value: data['incidentes'].length },
            { label: 'Exploits', value: data['exploits'].length },
            { label: 'Zero-Days', value: data['zerodays'].length },
            { label: 'CVEs Nuevos', value: data['cves'].length },
            { label: 'Alertas', value: data['alertas'].length },
            { label: 'Mitigaciones', value: data['mitigaciones'].length },
        ];
        const numColumns = 3;
        const cardGap = 15;
        const availableWidth = pageWidth - (margin * 2) - (cardGap * (numColumns - 1));
        const cardWidth = availableWidth / numColumns;
        const cardHeight = 60;
        
        metrics.forEach((metric, index) => {
            const col = index % numColumns;
            const row = Math.floor(index / numColumns);
            const cardX = margin + col * (cardWidth + cardGap);
            const cardY = startY + row * (cardHeight + cardGap);
            doc.setFillColor(COLOR_LIGHT_GREY_BG);
            doc.setDrawColor('#EAECEE');
            doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(28);
            doc.setTextColor(COLOR_GREY_TEXT);
            doc.text(String(metric.value), cardX + cardWidth / 2, cardY + 35, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(COLOR_GREY_TEXT);
            doc.text(metric.label, cardX + cardWidth / 2, cardY + 50, { align: 'center' });
        });
        const numRows = Math.ceil(metrics.length / numColumns);
        return startY + (numRows * cardHeight) + ((numRows - 1) * cardGap);
    };

    // --- PAGE 1: COVER ---
    doc.addImage(BACKGROUND_IMAGE_PATH, 'JPEG', 0, 0, pageWidth, 250); 

    doc.setFontSize(FONT_H1);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_WHITE);
    doc.text('CYBER THREAT INTELLIGENCE BRIEF', margin, 100);
    doc.setFontSize(48);
    doc.text('ACCENTURE', margin, 155);

    yPos = 205;
    // CORRECCIÓN DEL BUG DE FECHA: Usamos split y Date.UTC para evitar desfases
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const sDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    
    const reportMonthName = sDate.toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' });
    const capitalizedMonth = reportMonthName.charAt(0).toUpperCase() + reportMonthName.slice(1);
    const reportYear = sDate.getUTCFullYear(); // Forzamos año UTC
    const reportPeriodText = `${capitalizedMonth} ${reportYear}`;

    doc.setFillColor(COLOR_BLACK);
    doc.rect(margin, yPos, 150, 25, 'F');
    doc.setFontSize(FONT_H3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_WHITE);
    doc.text(reportPeriodText, margin + 10, yPos + 17);

    yPos += 25 + 35;
    yPos = drawMetricsCards(yPos);
    yPos += 10;

    // --- EXECUTIVE SUMMARY ---
    addSectionTitle('RESUMEN EJECUTIVO');
    const incidentesData = data['incidentes'];
    const cvesData = data['cves'];
    const zeroDaysData = data['zerodays'];
    const exploitsData = data['exploits'];
    
    const criticalVulns = cvesData.filter(cve => (parseFloat(cve.cvss) || 0) >= 9.0);
    const topSectors = getTopItems(incidentesData, 'sector');
    const topActors = getTopItems(incidentesData, 'actor');
    
    let summaryParagraph = `Análisis correspondiente al mes de ${reportMonthName} de ${reportYear}. Durante este tiempo, se publicaron ${cvesData.length} nuevas vulnerabilidades, de las cuales ${criticalVulns.length} se calificaron como críticas (CVSS 9.0+). Se registraron ${incidentesData.length} incidentes relevantes, con especial afectación al sector ${topSectors.length > 0 ? topSectors.join(' y ') : 'diversos'}. Los grupos de amenaza más destacados fueron ${topActors.length > 0 ? topActors.join(', ') : 'varios'}. Además, se descubrieron ${zeroDaysData.length} nuevas vulnerabilidades de día cero y se publicaron ${exploitsData.length} exploits con prueba de concepto.`;
    addIntroductoryText(summaryParagraph);

    addSectionTitle('Incidentes');
    addIntroductoryText('El conocimiento y la vigilancia de los ciber incidentes es fundamental para la seguridad de cualquier organización.');
    if (incidentesData.length > 0) {
        [...incidentesData].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).forEach(item => renderTextItem({
            title: `${item.tipo || 'N/A'} - ${item.entidad || 'Entidad no especificada'}`,
            details: [
                { label: 'Fecha: ', value: formatDate(item.fecha) },
                { label: 'Actor de Amenazas: ', value: item.actor || 'Desconocido' },
                { label: 'País y Sector: ', value: `${item.pais || 'N/A'} | ${item.sector || 'N/A'}` },
                { label: 'Datos Comprometidos: ', value: item.datosComprometidos || 'N/A' }
            ],
            description: item.descripcion || 'Sin descripción.',
            url: item.url,
            neededHeight: 100
        }));
    } else {
        addNoDataMessage();
    }

    addSectionTitle('Exploits Publicados');
    addIntroductoryText('Los exploit son puertas traseras que los atacantes pueden utilizar permitiendo el robo de datos.');
    if (exploitsData.length > 0) {
        const sortedExploits = [...exploitsData].sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        autoTable(doc, { 
            ...autoTableOptions, theme: 'grid', startY: yPos,
            head: [['Fecha', 'Nombre', 'Tipo', 'Plataforma', 'CVE Asociado', 'URL']],
            body: sortedExploits.map(e => [ formatDate(e.fecha), e.nombre || 'N/A', e.tipo || 'N/A', e.plataforma, e.cve || 'N/A', '' ]),
            columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 'auto' }, 5: { cellWidth: 40, halign: 'center' } },
            didDrawCell: (data) => {
                const exploit = sortedExploits[data.row.index];
                if (data.column.index === 5 && data.row.section === 'body') {
                    const textToDisplay = exploit && exploit.url ? 'Ver' : 'N/A';
                    doc.setTextColor(exploit && exploit.url ? COLOR_LINK : COLOR_GREY_TEXT);
                    if (exploit && exploit.url) {
                        doc.textWithLink(textToDisplay, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 4, { url: exploit.url, align: 'center' });
                    } else {
                        doc.text(textToDisplay, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 4, { align: 'center' });
                    }
                }
            }
        });
        yPos = (doc as any).lastAutoTable.finalY + 20;
    } else {
        addNoDataMessage();
    }

    addSectionTitle('Zero-Days');
    addIntroductoryText('Las vulnerabilidades de día cero son fallos de seguridad desconocidos para los fabricantes.');
    if (zeroDaysData.length > 0) {
        [...zeroDaysData].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).forEach(item => renderTextItem({
            title: `Zero Day: ${item.nombre || 'N/A'} (ID: ${item.idZD || 'N/A'})`,
            details: [
                { label: 'Fecha Detección: ', value: formatDate(item.fecha) },
                { label: 'Plataforma Afectada: ', value: item.plataforma || 'N/A' },
                { label: 'CVSS y Estado: ', value: `${item.cvss || 'N/A'} | ${item.estado || 'N/A'}` }
            ],
            description: item.descripcion || 'Sin descripción.',
            url: item.url,
            neededHeight: 90
        }));
    } else {
        addNoDataMessage();
    }

    addSectionTitle('Vulnerabilidades');
    addIntroductoryText('Las Vulnerabilidades Comunes Enumeradas (CVE) proporcionan detalles sobre vulnerabilidades de seguridad.');
    if (cvesData.length > 0) {
        const sortedCves = [...cvesData].sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        autoTable(doc, { 
            ...autoTableOptions, startY: yPos,
            head: [['ID CVE', 'Aplicativo', 'Fecha Pub.','Descripción', 'CVSS', 'URL']],
            body: sortedCves.map(c => [ c.cveId || 'N/A', c.aplicativo || 'N/A', formatDate(c.fecha), c.descripcion || 'N/A' , `${c.cvss || 'N/A'} (${getSeverityTextForCVSS(c.cvss)})`, '' ]),
            columnStyles: {0: { cellWidth: 70 }, 2: { cellWidth: 70 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 70 }, 5: { cellWidth: 40, halign: 'center' } },
            didDrawCell: (data) => {
                const cve = sortedCves[data.row.index];
                if (data.column.index === 5 && data.row.section === 'body') {
                    const textToDisplay = cve && cve.url ? 'Ver' : 'N/A';
                    doc.setTextColor(cve && cve.url ? COLOR_LINK : COLOR_GREY_TEXT);
                    if (cve && cve.url) {
                        doc.textWithLink(textToDisplay, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 4, { url: cve.url, align: 'center' });
                    } else {
                        doc.text(textToDisplay, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 4, { align: 'center' });
                    }
                }
            }
        });
        yPos = (doc as any).lastAutoTable.finalY + 20;
    } else {
        addNoDataMessage();
    }

    addSectionTitle('Alertas CTI');
    addIntroductoryText('Las alertas de Cyber Threat Intelligence informan sobre amenazas cibernéticas críticas.');
    const alertasData = data['alertas'];
    if (alertasData.length > 0) {
        [...alertasData].sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).forEach(item => renderTextItem({
            title: `${item.titulo || 'Sin título'} (Criticidad: ${item.criticidad || 'N/A'})`,
            details: [{ label: 'Fecha: ', value: formatDate(item.fecha) }],
            description: item.descripcion || 'Sin descripción.',
            url: item.url,
            neededHeight: 70
        }));
    } else {
        addNoDataMessage();
    }

    addSectionTitle('Recomendaciones');
    addIntroductoryText('Acciones defensivas proactivas para reducir la superficie de ataque.');
    const mitigacionesData = data['mitigaciones'];
    if (mitigacionesData.length > 0) {
        const priorityOrder: Record<string, number> = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
        [...mitigacionesData].sort((a,b) => (priorityOrder[a.prioridad] || 4) - (priorityOrder[b.prioridad] || 4)).forEach(item => renderTextItem({
            title: `${item.titulo || 'Recomendación sin título'}`,
            details: [{ label: 'Categoría y Prioridad: ', value: `${item.categoria || 'N/A'} | ${item.prioridad || 'N/A'}` }],
            description: item.descripcion || 'Sin descripción.',
            url: item.url,
            neededHeight: 80
        }));
    } else {
        addNoDataMessage('No se han definido mitigaciones específicas en el período seleccionado.');
    }

    addSectionTitle('Fuentes de Inteligencia');
    const fuentesData = data['fuentes'];
    if (fuentesData.length > 0) {
        [...fuentesData].sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).forEach(f => {
            renderTextItem({
                title: f.nombre || 'Fuente sin nombre',
                details: [{ label: 'Tipo: ', value: f.tipo || 'N/A' }],
                description: f.descripcion,
                url: f.url,
                neededHeight: 60
            });
        });
    } else {
        addNoDataMessage();
    }

    addSectionTitle('Equipo de CTI');
    addIntroductoryText('El contenido de este boletin fue proporcionado por el equipo de Cyber Threat Intelligence del Clan de Cyber Resilience de Accenture Buenos Aires.');
    
    yPos += 15;
    checkAndAddPage(30);
    doc.setFontSize(FONT_NORMAL);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_GREY_TEXT);
    
    const contactText = 'Contactanos vía mail: ';
    doc.text(contactText, margin, yPos);
    const textWidth = doc.getTextWidth(contactText);
    doc.setTextColor(COLOR_LINK);
    doc.textWithLink('Cyber_Intel_Ar@accenture.com', margin + textWidth, yPos, { url: 'mailto:Cyber_Intel_Ar@accenture.com' });

    addPageFooter();
    // NOMBRADO DINÁMICO CORREGIDO:
    doc.save(`CTI_Brief_${capitalizedMonth}_${reportYear}.pdf`);
  };

  const handleExcelExport = async () => {
    setLoading(true);
    try {
      const data = await fetchAllData(false);
      const wb = XLSX.utils.book_new();

      Object.keys(data).forEach(key => {
        if (data[key].length > 0) {
          const ws = XLSX.utils.json_to_sheet(data[key]);
          XLSX.utils.book_append_sheet(wb, ws, key.toUpperCase());
        }
      });

      XLSX.writeFile(wb, "CTI_Data_Export.xlsx");
      setStatusMsg("Excel exportado.");
    } catch (e) {
      console.error(e);
      setStatusMsg("Error al exportar Excel.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMsg("Leyendo archivo...");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        let totalImported = 0;

        for (const sheetName of wb.SheetNames) {
            const lowerName = sheetName.toLowerCase();
            let endpoint = '';
            if (lowerName.includes('incidente')) endpoint = 'incidentes';
            else if (lowerName.includes('exploit')) endpoint = 'exploits';
            else if (lowerName.includes('zero')) endpoint = 'zerodays';
            else if (lowerName.includes('cve')) endpoint = 'cves';
            else if (lowerName.includes('alerta')) endpoint = 'alertas';
            else if (lowerName.includes('fuente')) endpoint = 'fuentes';
            else if (lowerName.includes('mitigacion')) endpoint = 'mitigaciones';

            if (endpoint) {
                const sheetData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
                for (const row of sheetData) {
                    const response = await createResource(endpoint, row);
                    if (response.success) totalImported++;
                }
            }
        }
        setStatusMsg(`Importación completada: ${totalImported} registros.`);
      } catch (err) {
        console.error(err);
        setStatusMsg("Error al importar.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleEmailHtml = async () => {
    if (!startDate || !endDate) return alert("Selecciona fechas.");
    if (new Date(startDate) > new Date(endDate)) return alert("La fecha de inicio no puede ser posterior a la fecha de fin.");

    const data = await fetchAllData(true);
    
    // CORRECCIÓN DE FECHA EN EMAIL TAMBIÉN
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const sDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const reportMonth = monthNames[sDate.getUTCMonth()];
    const reportYear = sDate.getUTCFullYear();

    const incidentes = data['incidentes'];
    const cves = data['cves'];
    const exploits = data['exploits'];
    const zeroDays = data['zerodays'];

    const criticalCvesCount = cves.filter((c: any) => (parseFloat(c.cvss) || 0) >= 9.0).length;
    
    const topSectorsList = getTopItems(incidentes, 'sector', 2);
    const topSectors = topSectorsList.length > 0 ? topSectorsList.join(' y ') : 'diversos';

    const topActorsList = getTopItems(incidentes, 'actor', 2);
    const topActors = topActorsList.length > 0 ? topActorsList.join(', ') : 'varios';

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cyber Threat Intelligence Brief | ${reportMonth} ${reportYear}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 20px 0 30px 0;" align="center">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="700" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e0e6ed; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <tr>
                        <td align="left" style="padding: 30px 30px 20px 30px; background-color: #6A3093; color: #FFFFFF;">
                            <h1 style="margin: 0; font-size: 24px; font-family: 'Roboto', Arial, sans-serif;">Cyber Threat Intelligence Brief</h1>
                            <p style="margin: 5px 0 0; font-size: 16px; font-family: 'Roboto', Arial, sans-serif; color: #FFFFFF;">Informe de ${reportMonth} ${reportYear}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 30px 20px 30px;">
                            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Estimados, compartimos el resumen ejecutivo de la actividad de amenazas correspondiente al último período. El informe completo se encuentra adjunto.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <h2 style="font-size: 20px; color: #1c1c1c; margin: 0 0 15px 0; border-bottom: 2px solid #e0e6ed; padding-bottom: 10px;">Resumen Ejecutivo</h2>
                            <div style="background-color: #F8F9FA; padding: 20px; border-left: 4px solid #6A3093;">
                                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                    Análisis correspondiente al mes de <strong>${reportMonth} de ${reportYear}</strong>. Durante este tiempo, se publicaron <strong>${cves.length}</strong> nuevas vulnerabilidades, de las cuales <strong>${criticalCvesCount}</strong> se calificaron como críticas (CVSS 9.0+). Se registraron <strong>${incidentes.length}</strong> incidentes relevantes, con especial afectación al sector <strong>${topSectors}</strong>. Los grupos de amenaza más destacados fueron <strong>${topActors}</strong>.
                                    <br><br>
                                    Además, se descubrieron <strong>${zeroDays.length}</strong> nuevas vulnerabilidades de día cero y se publicaron <strong>${exploits.length}</strong> exploits con prueba de concepto.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 30px 30px 40px 30px; background-color: #F8F9FA;">
                            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Para un análisis exhaustivo y el listado completo de todos los eventos, por favor revise el informe PDF completo adjunto.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px 20px 30px; text-align: center; color: #888888; font-size: 12px; background-color: #e9ecef;">
                            <p style="margin: 0;">
                                Este reporte es clasificado como TLP:CLEAR (<a href="https://first.org/tlp/" style="color: #2574A9; text-decoration: none;">https://first.org/tlp/</a>)
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    </body>
    </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = `Boletin_CTI_${startDate.replace(/-/g, '')}_al_${endDate.replace(/-/g, '')}.html`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-800">Generación de Reportes y Exportación</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Fecha Inicio
                </label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Fecha Fin
                </label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
                onClick={handlePdfExport}
                disabled={loading}
                className="flex flex-col items-center justify-center p-6 bg-white border-2 border-purple-100 rounded-xl hover:border-purple-500 hover:shadow-md transition-all group text-center"
            >
                <div className="bg-purple-50 p-3 rounded-full mb-3 group-hover:bg-purple-100 transition-colors">
                    <FileText className="w-8 h-8 text-purple-600" />
                </div>
                <span className="font-semibold text-gray-800">Exportar PDF</span>
                <span className="text-xs text-gray-500 mt-1">Reporte Ejecutivo (Brief)</span>
            </button>

            <button 
                onClick={handleExcelExport}
                disabled={loading}
                className="flex flex-col items-center justify-center p-6 bg-white border-2 border-green-100 rounded-xl hover:border-green-500 hover:shadow-md transition-all group text-center"
            >
                <div className="bg-green-50 p-3 rounded-full mb-3 group-hover:bg-green-100 transition-colors">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                </div>
                <span className="font-semibold text-gray-800">Exportar Excel</span>
                <span className="text-xs text-gray-500 mt-1">Datos crudos completos</span>
            </button>

            <label className="flex flex-col items-center justify-center p-6 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-center cursor-pointer relative">
                <div className="bg-blue-50 p-3 rounded-full mb-3 group-hover:bg-blue-100 transition-colors">
                    <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <span className="font-semibold text-gray-800">Importar Excel</span>
                <span className="text-xs text-gray-500 mt-1">Cargar datos masivos</span>
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelImport} disabled={loading} />
            </label>

            <button 
                onClick={handleEmailHtml}
                disabled={loading}
                className="flex flex-col items-center justify-center p-6 bg-white border-2 border-orange-100 rounded-xl hover:border-orange-500 hover:shadow-md transition-all group text-center"
            >
                <div className="bg-orange-50 p-3 rounded-full mb-3 group-hover:bg-orange-100 transition-colors">
                    <Mail className="w-8 h-8 text-orange-600" />
                </div>
                <span className="font-semibold text-gray-800">Email HTML</span>
                <span className="text-xs text-gray-500 mt-1">Plantilla para correo</span>
            </button>
        </div>

        {statusMsg && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md flex items-center gap-3 text-sm text-gray-700">
                {loading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
                {statusMsg}
            </div>
        )}
      </div>
    </div>
  );
};
