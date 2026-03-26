import React, { useEffect, useState, useMemo } from 'react';
import { fetchTickets, saveTicket, deleteTicket, addTicketComment } from '../services/api';
import { RiskTicket, RiskPriority, NewsItem } from '../types';
import { 
  Plus, Search, Trash2, Edit2, ChevronDown, ChevronUp, 
  Clock, Send, FileDown, Filter, X 
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTableModule from 'jspdf-autotable';

// Fix for autoTable in ESM environments
const autoTable = (autoTableModule as any).default || autoTableModule;

interface RisksProps {
  prefillData: NewsItem | null;
  onClearPrefill: () => void;
}

const STATUS_OPTIONS = ['detectado', 'notificado', 'mitigando', 'resuelto', 'riesgo-aceptado'];

export const Risks: React.FC<RisksProps> = ({ prefillData, onClearPrefill }) => {
  // --- Data State ---
  const [tickets, setTickets] = useState<RiskTicket[]>([]);
  
  // --- Filter State ---
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterClient, setFilterClient] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // --- UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | number | null>(null);
  const [newComments, setNewComments] = useState<{[key: string]: string}>({});
  const [editingTicket, setEditingTicket] = useState<RiskTicket | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // --- Status Change Modal State ---
  const [statusModal, setStatusModal] = useState<{isOpen: boolean, ticketId: string | number | null, newStatus: string, comment: string}>({
    isOpen: false, ticketId: null, newStatus: '', comment: ''
  });

  // --- Form State ---
  const [formData, setFormData] = useState({
    title: '',
    customers: '',
    tags: '',
    priority: 'medium' as RiskPriority,
    description: ''
  });

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (prefillData) {
      setFormData({
        title: `Riesgo: ${prefillData.title}`,
        customers: '',
        tags: prefillData.feedTitle.toLowerCase().replace(/\s/g, '-'),
        priority: 'medium',
        description: `${prefillData.description || ''}\n\nFuente: ${prefillData.feedTitle}\nLink: ${prefillData.link}`
      });
      setEditingTicket(null);
      setIsModalOpen(true);
      onClearPrefill();
    }
  }, [prefillData, onClearPrefill]);

  const loadTickets = async () => {
    const data = await fetchTickets();
    setTickets(data);
  };

  // --- Derived Data for Dropdowns ---
  const uniqueClients = useMemo(() => {
    const clients = new Set<string>();
    tickets.forEach(t => (t.customers || []).forEach(c => clients.add(c)));
    return Array.from(clients).sort();
  }, [tickets]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tickets.forEach(t => (t.tags || []).forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [tickets]);

  // --- Filtering Logic ---
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // 1. Status
      const matchesStatus = filterStatus === 'todos' || t.status === filterStatus;
      
      // 2. Search (Title, ID, Description)
      const matchesSearch = !search || 
                            t.title.toLowerCase().includes(search.toLowerCase()) || 
                            t.description.toLowerCase().includes(search.toLowerCase()) ||
                            String(t.id).includes(search);

      // 3. Client
      const matchesClient = !filterClient || (t.customers || []).includes(filterClient);

      // 4. Tag
      const matchesTag = !filterTag || (t.tags || []).includes(filterTag);

      // 5. Date Range
      let matchesDate = true;
      const ticketDate = new Date(t.createdAt);
      if (dateStart) {
        const start = new Date(dateStart);
        start.setHours(0,0,0,0);
        if (ticketDate < start) matchesDate = false;
      }
      if (dateEnd) {
        const end = new Date(dateEnd);
        end.setHours(23,59,59,999);
        if (ticketDate > end) matchesDate = false;
      }

      return matchesStatus && matchesSearch && matchesClient && matchesTag && matchesDate;
    });
  }, [tickets, filterStatus, search, filterClient, filterTag, dateStart, dateEnd]);

  // --- Handlers ---

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    
    // If creating new, we do NOT generate ID. The backend/DB will do it.
    const newTicket: RiskTicket = editingTicket ? {
      ...editingTicket,
      title: formData.title,
      customers: formData.customers.split(',').map(s => s.trim()).filter(Boolean),
      tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
      priority: formData.priority,
      description: formData.description,
      lastUpdated: now
    } : {
      // id is undefined for new tickets
      title: formData.title,
      customers: formData.customers.split(',').map(s => s.trim()).filter(Boolean),
      tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
      priority: formData.priority,
      description: formData.description,
      status: 'detectado',
      createdAt: now,
      lastUpdated: now,
      // No need to inject username here, backend will do it for the initial entry
      activity: [{ type: 'status_change', timestamp: now, status: 'detectado', comment: 'Ticket creado' }]
    };

    await saveTicket(newTicket);
    setIsModalOpen(false);
    resetForm();
    loadTickets();
  };

  const handleDelete = async (id: string | number) => {
    if (window.confirm('¿Estás seguro de eliminar este ticket? Esta acción es irreversible.')) {
      await deleteTicket(id);
      loadTickets();
    }
  };

  const handleEdit = (ticket: RiskTicket, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTicket(ticket);
    setFormData({
      title: ticket.title,
      customers: (ticket.customers || []).join(', '),
      tags: (ticket.tags || []).join(', '),
      priority: ticket.priority,
      description: ticket.description
    });
    setIsModalOpen(true);
  };

  // Opens the modal to confirm status change
  const initiateStatusChange = (ticketId: string | number, newStatus: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;
    
    setStatusModal({
      isOpen: true,
      ticketId,
      newStatus,
      comment: ''
    });
  };

  // Commits the status change
  const confirmStatusChange = async () => {
    if (!statusModal.comment.trim()) {
      alert("Por favor añade un comentario para el cambio de estado.");
      return;
    }
    
    const ticket = tickets.find(t => t.id === statusModal.ticketId);
    if (ticket) {
      const updated = {
        ...ticket,
        status: statusModal.newStatus as any,
        lastUpdated: Date.now(),
        activity: [...(ticket.activity || []), { 
          type: 'status_change' as const, 
          timestamp: Date.now(), 
          status: statusModal.newStatus, 
          comment: statusModal.comment 
          // Username will be injected by the backend
        }]
      };
      await saveTicket(updated);
      loadTickets();
    }
    setStatusModal({ isOpen: false, ticketId: null, newStatus: '', comment: '' });
  };

  const handleCommentSubmit = async (ticketId: string | number, e: React.FormEvent) => {
    e.preventDefault();
    const comment = newComments[String(ticketId)];
    if (!comment?.trim()) return;

    // The backend will inject the username based on the authenticated user.
    await addTicketComment(ticketId, comment);
    setNewComments(prev => ({...prev, [String(ticketId)]: ''}));
    loadTickets();
  };

  const resetForm = () => {
    setFormData({ title: '', customers: '', tags: '', priority: 'medium', description: '' });
    setEditingTicket(null);
  };

  // --- PDF Helpers ---

  const formatMillisToDHMS = (millis: number) => {
    let d = Math.floor(millis / 86400000);
    let h = Math.floor((millis % 86400000) / 3600000);
    let m = Math.round(((millis % 86400000) % 3600000) / 60000);
    return `${d}d ${h}h ${m}m`;
  };

  const generateIndividualPdf = (ticket: RiskTicket) => {
    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 40;
        let yPos = margin;

        const COLOR_PRIMARY = '#16213E';
        const COLOR_TEXT_DARK = '#333333';
        const COLOR_TEXT_LIGHT = '#666666';
        const COLOR_BORDER = '#e0e6ed';

        const FONT_H1 = 20;
        const FONT_H2 = 14;
        const FONT_NORMAL = 10;
        const FONT_SMALL = 8;

        const addSectionTitleToPdf = (title: string) => {
            if (yPos + 40 > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
            }
            yPos += 15;
            doc.setFontSize(FONT_H2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(COLOR_PRIMARY);
            doc.text(title, margin, yPos);
            yPos += 10;
            doc.setDrawColor(COLOR_PRIMARY);
            doc.setLineWidth(0.5);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 15;
        };

        // Título del documento
        doc.setFontSize(FONT_H1);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLOR_PRIMARY);
        doc.text(`Detalle del Ticket de Riesgo #${ticket.id}`, margin, yPos);
        yPos += 20;

        // Información general
        addSectionTitleToPdf('Información General');
        doc.setFontSize(FONT_NORMAL);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_TEXT_DARK);

        const safeCustomers = ticket.customers || [];
        const safeTags = ticket.tags || [];

        const detailLines = [
            `Título: ${ticket.title}`,
            `Prioridad: ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}`,
            `Estado: ${ticket.status.replace('-', ' ').charAt(0).toUpperCase() + ticket.status.replace('-', ' ').slice(1)}`,
            `Clientes: ${safeCustomers.join(', ') || 'N/A'}`,
            `Tags: ${safeTags.join(', ') || 'N/A'}`,
            `Creado el: ${new Date(ticket.createdAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`,
            `Última Actualización: ${new Date(ticket.lastUpdated).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`
        ];
        doc.text(detailLines, margin, yPos);
        yPos += (detailLines.length * (FONT_NORMAL + 3)) + 10;

        // Descripción
        addSectionTitleToPdf('Descripción');
        doc.setFontSize(FONT_NORMAL);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_TEXT_DARK);
        const descriptionText = ticket.description || 'No hay descripción disponible.';
        const splitDescription = doc.splitTextToSize(descriptionText, pageWidth - (margin * 2));
        doc.text(splitDescription, margin, yPos);
        yPos += (splitDescription.length * (FONT_NORMAL + 2)) + 10;

        // Historial de actividad
        addSectionTitleToPdf('Historial de Actividad');
        
        const safeActivity = ticket.activity || [];
        const activityData = [...safeActivity].sort((a, b) => a.timestamp - b.timestamp).map(log => {
            const time = new Date(log.timestamp).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
            let typeDisplay = '';
            let detail = '';
            let username = log.username ? ` (${log.username})` : ''; // Include username
            if (log.type === 'comment') {
                typeDisplay = 'Comentario' + username;
                detail = log.text || '';
            } else if (log.type === 'status_change') {
                typeDisplay = 'Cambio de Estado' + username;
                detail = `A "${log.status?.replace('-', ' ').toUpperCase()}". Nota: "${log.comment || ''}"`;
            }
            return [time, typeDisplay, detail];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['Fecha y Hora', 'Tipo', 'Detalle']],
            body: activityData,
            theme: 'grid',
            headStyles: {
                fillColor: COLOR_PRIMARY,
                textColor: '#ffffff',
                fontStyle: 'bold',
                fontSize: FONT_SMALL
            },
            styles: {
                fontSize: FONT_SMALL,
                cellPadding: 5,
                textColor: COLOR_TEXT_DARK,
                lineColor: COLOR_BORDER,
                lineWidth: 0.5
            },
            columnStyles: {
                0: { cellWidth: 80 }, // Fecha y Hora
                1: { cellWidth: 80 }, // Tipo
                2: { cellWidth: 'auto' } // Detalle
            },
            didDrawPage: function (data: any) {
                doc.setFontSize(FONT_SMALL);
                doc.setTextColor(COLOR_TEXT_LIGHT);
                doc.text(`Ticket #${ticket.id}`, margin, pageHeight - 20);
                doc.text(`Página ${data.pageNumber} de ${data.pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
            },
            margin: { top: 40, bottom: 40, left: margin, right: margin }
        });

        doc.save(`ticket_${ticket.id}_${ticket.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.pdf`);
    } catch (e) {
        console.error("Error generating PDF", e);
        alert("Error generando PDF individual.");
    }
  };

  const generateListPdf = () => {
    if (filteredTickets.length === 0) {
        alert("No hay tickets para exportar con los filtros actuales.");
        return;
    }
    setIsExporting(true);
    setTimeout(() => {
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const margin = 40;
            let yPos = margin;

            const COLOR_PRIMARY = '#16213E';
            const COLOR_ACCENT = '#00F5C3'; // Used for lines/accents
            const COLOR_WHITE = '#FFFFFF';
            const COLOR_TEXT_DARK = '#333333';
            const COLOR_TEXT_LIGHT = '#666666';
            const COLOR_BACKGROUND = '#F8F9FA';

            const FONT_H2 = 14;
            const FONT_H3 = 11;
            const FONT_NORMAL = 10;
            const FONT_SMALL = 8;

            const autoTableStyles = { 
                headStyles: { fillColor: COLOR_PRIMARY, textColor: COLOR_WHITE, fontSize: FONT_SMALL }, 
                styles: { fontSize: FONT_SMALL, cellPadding: 5 } 
            };

            const addPageFooter = () => {
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(FONT_SMALL); doc.setTextColor(COLOR_TEXT_LIGHT);
                    doc.text(`Reporte de Tickets de Riesgo`, margin, pageHeight - 20);
                    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
                }
            };

            const checkAndAddPage = (neededHeight: number) => { 
                if (yPos + neededHeight > pageHeight - margin - 20) { 
                    doc.addPage(); 
                    yPos = margin; 
                } 
            };

            const addSectionTitle = (title: string) => {
                checkAndAddPage(40);
                yPos += 20;
                doc.setFontSize(FONT_H2); doc.setFont('helvetica', 'bold'); doc.setTextColor(COLOR_PRIMARY);
                doc.text(title, margin, yPos);
                yPos += 15;
                doc.setDrawColor(COLOR_ACCENT); doc.setLineWidth(1.5);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 20;
            };

            // --- KPIs Calculation ---
            const resolvedTickets = filteredTickets.filter(t => t.status === 'resuelto');
            let totalResolutionTime = 0;
            resolvedTickets.forEach(t => { 
                const acts = t.activity || []; // Safe access
                const rEvent = acts.find(a => a.type === 'status_change' && a.status === 'resuelto'); 
                if (rEvent) totalResolutionTime += (rEvent.timestamp - t.createdAt); 
            });
            const avgResolutionTimeMillis = resolvedTickets.length > 0 ? totalResolutionTime / resolvedTickets.length : 0;
            const avgResolutionText = resolvedTickets.length > 0 ? formatMillisToDHMS(avgResolutionTimeMillis) : "No aplica";

            const priorityCounts: Record<string, number> = filteredTickets.reduce((acc: any, t) => {
                acc[t.priority] = (acc[t.priority] || 0) + 1;
                return acc;
            }, {});
            
            // Safe access for customers
            const allCustomers = filteredTickets.flatMap(t => t.customers || []);
            const customerCounts = allCustomers.reduce((acc: any, c) => { acc[c] = (acc[c]||0)+1; return acc; }, {});
            const mostAffectedCustomer = Object.entries(customerCounts).sort((a: any, b: any) => b[1]-a[1])[0]?.[0] || "N/A";
            
            const statusCounts: Record<string, number> = filteredTickets.reduce((acc: any, t) => {
                acc[t.status] = (acc[t.status]||0)+1;
                return acc;
            }, {});

            const openCount = filteredTickets.length - ((statusCounts.resuelto || 0) + (statusCounts['riesgo-aceptado'] || 0));

            // --- COVER PAGE ---
            doc.setFillColor(COLOR_PRIMARY); doc.rect(0, 0, pageWidth, pageHeight, 'F');
            doc.setFontSize(32); doc.setFont('helvetica', 'bold'); doc.setTextColor(COLOR_WHITE);
            doc.text('Reporte de Tickets de Riesgo', pageWidth/2, pageHeight/2 - 40, {align:'center'});
            
            doc.setFontSize(16); doc.setFont('helvetica', 'normal');
            const rangeText = (dateStart || dateEnd) 
                ? `Período: ${dateStart || 'Inicio'} al ${dateEnd || 'Actualidad'}` 
                : `Fecha de Emisión: ${new Date().toLocaleDateString('es-ES')}`;
            doc.text(rangeText, pageWidth/2, pageHeight/2, {align:'center'});
            
            if (search || filterStatus !== 'todos' || filterClient || filterTag) {
                const filtersApplied = [];
                if (filterStatus !== 'todos') filtersApplied.push(`Estado: ${filterStatus}`);
                if (filterClient) filtersApplied.push(`Cliente: ${filterClient}`);
                if (filterTag) filtersApplied.push(`Tag: ${filterTag}`);
                if (search) filtersApplied.push(`Búsqueda: "${search}"`);
                
                doc.setFontSize(12); doc.setTextColor('#cccccc');
                doc.text(`Filtros: ${filtersApplied.join(' | ')}`, pageWidth/2, pageHeight/2 + 30, {align:'center'});
            }

            doc.addPage();
            yPos = margin;

            // --- KPI SECTION ---
            addSectionTitle('Dashboard Resumen');
            
            const kpiMetrics = [
                { label: 'Tickets Totales', value: filteredTickets.length },
                { label: 'Tickets Abiertos', value: openCount },
                { label: 'Prioridad Alta', value: priorityCounts.high || 0 },
                { label: 'Prom. Resolución', value: avgResolutionText },
                { label: 'Cliente Principal', value: mostAffectedCustomer }
            ];

            // Draw cards manually
            const cardWidth = (pageWidth - margin * 2 - 20 * 2) / 3;
            const cardHeight = 60;
            
            // Row 1 (3 items)
            kpiMetrics.slice(0, 3).forEach((metric, index) => {
                const cardX = margin + index * (cardWidth + 20);
                doc.setFillColor(COLOR_BACKGROUND); doc.setDrawColor('#EAECEE');
                doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 5, 5, 'FD');
                doc.setFontSize(22); doc.setFont('helvetica','bold'); doc.setTextColor(COLOR_TEXT_DARK); 
                doc.text(String(metric.value), cardX + cardWidth/2, yPos + 30, {align:'center'});
                doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(COLOR_TEXT_LIGHT); 
                doc.text(metric.label, cardX + cardWidth/2, yPos + 45, {align:'center'});
            });
            yPos += cardHeight + 20;

            // Row 2 (2 items centered)
            kpiMetrics.slice(3, 5).forEach((metric, index) => {
                const cardX = margin + (index * (cardWidth + 20)) + (pageWidth - margin * 2 - (2 * cardWidth + 20)) / 2;
                doc.setFillColor(COLOR_BACKGROUND); doc.setDrawColor('#EAECEE');
                doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 5, 5, 'FD');
                doc.setFontSize(20); doc.setFont('helvetica','bold'); doc.setTextColor(COLOR_TEXT_DARK); 
                doc.text(String(metric.value), cardX + cardWidth/2, yPos + 30, {align:'center'});
                doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(COLOR_TEXT_LIGHT); 
                doc.text(metric.label, cardX + cardWidth/2, yPos + 45, {align:'center'});
            });
            yPos += cardHeight + 30;

            // Analysis Text
            doc.setFontSize(FONT_H3); doc.setFont('helvetica', 'bold'); doc.setTextColor(COLOR_PRIMARY);
            doc.text('Análisis de Datos', margin, yPos);
            yPos += 15;
            doc.setFontSize(FONT_NORMAL); doc.setFont('helvetica', 'normal'); doc.setTextColor(COLOR_TEXT_DARK);
            const analysisText = `El análisis de los ${filteredTickets.length} tickets muestra que un ${filteredTickets.length > 0 ? ((statusCounts.resuelto || 0) / filteredTickets.length * 100).toFixed(1) : '0.0'}% fueron resueltos. Los tickets de prioridad alta (${priorityCounts.high || 0}) representan un foco de atención clave.`;
            
            const analysisLines = doc.splitTextToSize(analysisText, pageWidth - (margin * 2));
            doc.text(analysisLines, margin, yPos);
            yPos += (doc.getTextDimensions(analysisLines).h || 15) + 30;

            // --- LIST TABLE ---
            addSectionTitle('Listado de Tickets');
            autoTable(doc, { 
                ...autoTableStyles, 
                startY: yPos, 
                head: [['ID', 'Título', 'Estado', 'Prioridad', 'Creado el']], 
                body: filteredTickets.map(t => [
                    t.id || 'N/A', 
                    t.title || 'Sin Título', 
                    (t.status || 'N/A').replace('-',' '), 
                    t.priority || 'medium', 
                    new Date(t.createdAt).toLocaleDateString('es-ES')
                ]) 
            });
            yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : yPos + 20;

            // --- DETAILED VIEW ---
            addSectionTitle('Detalle Individual de Tickets');
            
            filteredTickets.forEach(ticket => {
                checkAndAddPage(150);
                
                // Header for Ticket
                doc.setFontSize(FONT_H3); doc.setFont('helvetica', 'bold'); doc.setTextColor(COLOR_PRIMARY);
                const titleText = `Ticket #${ticket.id || '?'}: ${(ticket.title || '').substring(0, 50)}${(ticket.title || '').length > 50 ? '...' : ''}`;
                doc.text(titleText, margin, yPos); 
                yPos += 15;
                
                // Metadata Block
                doc.setFontSize(FONT_NORMAL); doc.setFont('helvetica', 'normal'); doc.setTextColor(COLOR_TEXT_DARK);
                
                const safeCust = ticket.customers || [];
                const safeTgs = ticket.tags || [];

                const ticketDetails = [
                    `Prioridad: ${ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : 'Media'}`,
                    `Estado: ${(ticket.status || 'N/A').replace('-', ' ').toUpperCase()}`,
                    `Creado: ${new Date(ticket.createdAt).toLocaleString('es-ES')}`,
                    `Clientes: ${safeCust.join(', ') || 'N/A'}`,
                    `Tags: ${safeTgs.join(', ') || 'N/A'}`
                ];
                
                // Draw metadata in two columns roughly
                const leftCol = ticketDetails.slice(0, 3);
                const rightCol = ticketDetails.slice(3);
                
                leftCol.forEach((line, i) => doc.text(line, margin, yPos + (i*12)));
                rightCol.forEach((line, i) => doc.text(line, margin + 250, yPos + (i*12)));
                
                yPos += (Math.max(leftCol.length, rightCol.length) * 12) + 15;

                // Description
                const descLines = doc.splitTextToSize(`Descripción: ${ticket.description || 'No hay descripción disponible.'}`, pageWidth - margin*2);
                doc.setFont('helvetica', 'bold'); doc.setTextColor(COLOR_PRIMARY);
                doc.text('Descripción:', margin, yPos); yPos += 12;
                doc.setFont('helvetica', 'normal'); doc.setTextColor(COLOR_TEXT_DARK);
                doc.text(descLines, margin, yPos);
                yPos += doc.getTextDimensions(descLines).h + 15;

                // Activity Table
                doc.setFont('helvetica', 'bold'); doc.setTextColor(COLOR_PRIMARY);
                doc.text('Historial Reciente:', margin, yPos); yPos += 5;
                
                const safeActs = ticket.activity || [];
                const activityBody = [...safeActs].sort((a,b)=>b.timestamp-a.timestamp).slice(0, 5).map(log => [
                    new Date(log.timestamp).toLocaleString('es-ES'), 
                    log.type==='comment'?'Comentario':`Estado: ${log.status?.replace('-',' ')}`, 
                    log.type==='comment'? (log.text || '') : (log.comment || '')
                ]);
                
                autoTable(doc, { 
                    ...autoTableStyles, 
                    startY: yPos, 
                    head: [['Fecha', 'Tipo', 'Detalle']], 
                    body: activityBody, 
                    columnStyles: {
                        0: { cellWidth: 90 },
                        1: { cellWidth: 80 },
                        2: { cellWidth: 'auto' }
                    },
                    margin: { left: margin, right: margin }
                });
                yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 30 : yPos + 30;
            });

            addPageFooter();
            doc.save(`Reporte_Riesgos_${new Date().toISOString().slice(0,10)}.pdf`);

        } catch (error) {
            console.error("Error generating list PDF", error);
            alert("Ocurrió un error al generar el reporte PDF.");
        } finally {
            setIsExporting(false);
        }
    }, 100);
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getBorderColor = (p: string) => {
    switch(p) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-orange-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* --- Controls & Filter Bar --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por título, ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Nuevo Riesgo
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setFilterStatus('todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === 'todos' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todos
          </button>
          {STATUS_OPTIONS.map(status => (
            <button 
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                filterStatus === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Cliente</label>
            <div className="relative">
              <select 
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">Todos</option>
                {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
            </div>
          </div>
           <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Tag</label>
            <div className="relative">
              <select 
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 appearance-none"
              >
                <option value="">Todos</option>
                {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
            </div>
          </div>
          
          <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Fecha Inicio</label>
              <input 
                  type="date" 
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
          </div>
           <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Fecha Fin</label>
              <input 
                  type="date" 
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
          </div>

          <button 
            onClick={generateListPdf}
            disabled={isExporting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap disabled:opacity-70"
          >
            <FileDown className="w-4 h-4" /> {isExporting ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* --- Ticket List --- */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 text-gray-500">
            No se encontraron tickets con los criterios seleccionados.
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <div 
              key={ticket.id} 
              className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden border-l-4 ${getBorderColor(ticket.priority)}`}
            >
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : (ticket.id ?? null))}
              >
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{ticket.title}</h3>
                      <span className="text-xs text-gray-400 font-mono max-w-[80px] truncate">#{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {(ticket.customers || []).map((c, i) => (
                        <span 
                          key={i} 
                          onClick={(e) => { e.stopPropagation(); setFilterClient(c); }}
                          className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium border border-indigo-100 hover:bg-indigo-100 cursor-pointer"
                        >
                          {c}
                        </span>
                      ))}
                      {(ticket.tags || []).map((t, i) => (
                        <span 
                          key={i} 
                          onClick={(e) => { e.stopPropagation(); setFilterTag(t); }}
                          className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs border border-gray-200 hover:bg-gray-200 cursor-pointer"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end lg:self-center" onClick={e => e.stopPropagation()}>
                    <select 
                      value={ticket.status}
                      onChange={(e) => ticket.id && initiateStatusChange(ticket.id, e.target.value)}
                      className="text-xs border-gray-300 border rounded shadow-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 bg-white capitalize"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt.replace('-', ' ')}</option>
                      ))}
                    </select>
                    <button 
                      onClick={(e) => { e.stopPropagation(); generateIndividualPdf(ticket); }}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                      title="Exportar Ticket a PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleEdit(ticket, e)} 
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => ticket.id && handleDelete(ticket.id)} 
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTicketId(expandedTicketId === ticket.id ? null : (ticket.id ?? null));
                      }}
                    >
                      {expandedTicketId === ticket.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {expandedTicketId === ticket.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descripción</h4>
                        <div className="bg-white p-4 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap shadow-sm">
                          {ticket.description}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Añadir Comentario</h4>
                        <form onSubmit={(e) => ticket.id && handleCommentSubmit(ticket.id, e)} className="flex gap-2">
                          <textarea
                            value={ticket.id ? (newComments[String(ticket.id)] || '') : ''}
                            onChange={e => ticket.id && setNewComments(prev => ({...prev, [String(ticket.id)]: e.target.value}))}
                            placeholder="Escribe un comentario..."
                            className="flex-1 p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] bg-white"
                          />
                          <button 
                            type="submit"
                            className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-md self-end py-2 transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="lg:col-span-1">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Historial de Actividad</h4>
                      <div className="relative pl-4 border-l-2 border-gray-200 space-y-6">
                        {[...(ticket.activity || [])].sort((a,b) => b.timestamp - a.timestamp).map((log, idx) => (
                          <div key={idx} className="relative group">
                            <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                              log.type === 'status_change' ? 'bg-blue-500' : 'bg-gray-400'
                            }`}></div>
                            <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(log.timestamp).toLocaleString()}
                              {log.username && <span className="font-medium text-gray-500 ml-1">por {log.username}</span>}
                            </div>
                            <div className="text-sm bg-white p-3 rounded border border-gray-200 shadow-sm">
                              {log.type === 'status_change' ? (
                                <div>
                                  <span className="font-bold text-gray-800 text-xs uppercase">Cambio de estado</span>
                                  <div className="text-blue-700 mt-1 text-xs">
                                    A <span className="font-bold uppercase">{log.status?.replace('-', ' ')}</span>
                                  </div>
                                  {log.comment && <div className="mt-2 text-gray-600 italic text-xs border-t border-gray-100 pt-2">"{log.comment}"</div>}
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-gray-800 text-xs uppercase">Comentario</span>
                                  <div className="text-gray-700 mt-1">
                                    {log.text}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTicket ? 'Editar Riesgo' : 'Nuevo Riesgo'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Título del riesgo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clientes</label>
                  <input 
                    type="text" 
                    value={formData.customers}
                    onChange={e => setFormData({...formData, customers: e.target.value})}
                    placeholder="Separados por coma"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input 
                    type="text" 
                    value={formData.tags}
                    onChange={e => setFormData({...formData, tags: e.target.value})}
                    placeholder="Separados por coma"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <div className="flex gap-4">
                   {(['low', 'medium', 'high'] as RiskPriority[]).map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="priority"
                        checked={formData.priority === p}
                        onChange={() => setFormData({...formData, priority: p})}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize text-sm">{p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}</span>
                    </label>
                   ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none min-h-[150px]"
                  placeholder="Descripción detallada del riesgo..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {editingTicket ? 'Guardar Cambios' : 'Crear Riesgo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
             <div className="p-6">
               <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Cambio de Estado</h3>
               <p className="text-sm text-gray-600 mb-4">
                 Estás cambiando el estado a <span className="font-bold uppercase">{statusModal.newStatus.replace('-', ' ')}</span>. Por favor, añade un comentario para el historial.
               </p>
               <textarea 
                 value={statusModal.comment}
                 onChange={(e) => setStatusModal({...statusModal, comment: e.target.value})}
                 className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                 placeholder="Motivo del cambio..."
                 autoFocus
               />
               <div className="flex justify-end gap-3 mt-4">
                 <button 
                   onClick={() => setStatusModal({...statusModal, isOpen: false, comment: ''})}
                   className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={confirmStatusChange}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                 >
                   Confirmar Cambio
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};