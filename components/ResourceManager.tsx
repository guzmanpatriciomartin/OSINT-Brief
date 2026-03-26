
import React, { useState, useEffect } from 'react';
import { fetchResource, createResource, updateResource, deleteResource } from '../services/api';
import { Plus, Search, Edit2, Trash2, X, Loader2, ExternalLink, AlertCircle, Clock } from 'lucide-react';

export interface ColumnDef {
  header: string;
  accessor: string;
  type?: 'text' | 'date' | 'badge' | 'link';
  badgeColors?: Record<string, string>;
}

export interface FormField {
  label: string;
  name: string;
  // FIX: Add 'link' to the type union for FormField to resolve unintentional comparison error
  type: 'text' | 'date' | 'number' | 'select' | 'textarea' | 'link';
  options?: string[];
  required?: boolean;
}

interface ResourceManagerProps {
  resourceKey: string;
  title: string;
  columns: ColumnDef[];
  formFields: FormField[];
  idField?: string;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({ 
  resourceKey, 
  title, 
  columns, 
  formFields,
  idField 
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchResource<any>(resourceKey);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [resourceKey]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchLower)
    );
  });

  const handleAddNew = () => {
    setEditingItem(null);
    setErrorMsg(null);
    const initialData: Record<string, any> = {};
    formFields.forEach(field => { initialData[field.name] = ''; });
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setErrorMsg(null);
    const initialData: Record<string, any> = {};
    
    formFields.forEach(field => {
        // Handle date formatting for input type="date" (requires yyyy-MM-dd)
        if (field.type === 'date' && item[field.name]) {
             try {
                initialData[field.name] = new Date(item[field.name]).toISOString().split('T')[0];
             } catch {
                initialData[field.name] = item[field.name];
             }
        } else {
            initialData[field.name] = item[field.name] || '';
        }
    });
    setFormData(initialData);
    setIsModalOpen(true);
  };

  // Improved ID resolution logic
  const resolveId = (item: any): string | number | undefined => {
    // 1. Priority: Standard Database IDs (REST standard)
    if (item._id !== undefined && item._id !== null) return item._id;
    
    // 2. Priority: Standard 'id' (Mongoose virtual)
    // This MUST take precedence over 'idField' for API operations (PUT/DELETE) 
    // because the backend uses findById() which requires the Hex ObjectId.
    if (item.id !== undefined && item.id !== null) return item.id;

    // 3. Priority: Configured ID Field (e.g., idZD, cveId) - Fallback
    if (idField && item[idField] !== undefined && item[idField] !== null) return item[idField];

    return undefined;
  };

  const handleDelete = async (itemToDelete: any) => {
    const id = resolveId(itemToDelete); // Use the resolved ID for deletion
    console.log(`[ResourceManager] Attempting to delete from ${resourceKey} with ID:`, id);
    
    if (id === undefined || id === null || id === '') {
      alert('Error: No se pudo identificar el ID del registro para eliminar. Verifica los datos.');
      return;
    }

    if (window.confirm('¿Estás seguro de eliminar este registro?')) {
      setLoading(true);
      try {
        // encodeURIComponent ensures IDs with special chars (like slashes or spaces) don't break the URL
        const response = await deleteResource(resourceKey, encodeURIComponent(String(id)));
        if (response.success) {
          await loadData();
        } else {
          console.error('Delete failed:', response.message);
          alert(`Error al eliminar: ${response.message}`);
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('Ocurrió un error al intentar eliminar el registro.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    
    // Prepare data with correct types
    const dataToSend: Record<string, any> = { ...formData };

    // Convert number fields safely
    formFields.forEach(field => {
      if (field.type === 'number') {
        const val = dataToSend[field.name];
        if (val !== '' && val !== null && val !== undefined) {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            dataToSend[field.name] = num;
          }
        }
      }
    });

    let response;
    if (editingItem) {
      const id = resolveId(editingItem);
      if (id === undefined || id === null) {
        setErrorMsg("No se pudo identificar el ID para actualizar.");
        setSubmitting(false);
        return;
      }
      response = await updateResource(resourceKey, String(id), dataToSend);
    } else {
      response = await createResource(resourceKey, dataToSend);
    }

    setSubmitting(false);

    if (response.success) {
      setIsModalOpen(false);
      loadData();
    } else {
      setErrorMsg(response.message || 'Error desconocido al guardar. Verifica los datos.');
    }
  };

  const getBadgeClass = (value: string, def: ColumnDef) => {
    if (def.badgeColors && def.badgeColors[value]) return def.badgeColors[value];
    
    const val = String(value).toLowerCase();
    if (val === 'critica' || val === 'crítica' || val === 'alta' || parseFloat(val) >= 7) return 'bg-red-100 text-red-800 border border-red-200';
    if (val === 'media' || (parseFloat(val) >= 4 && parseFloat(val) < 7)) return 'bg-orange-100 text-orange-800 border border-orange-200';
    if (val === 'baja' || parseFloat(val) < 4) return 'bg-green-100 text-green-800 border border-green-200';
    if (val === 'mitigado') return 'bg-green-100 text-green-800';
    if (val === 'activo' || val === 'explotadoactivamente') return 'bg-red-100 text-red-800';
    
    return 'bg-gray-100 text-gray-800';
  };

  const renderCell = (item: any, col: ColumnDef) => {
    const val = item[col.accessor];
    if (val === undefined || val === null || val === '') return <span className="text-gray-400">-</span>;

    if (col.type === 'date') {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('es-ES', { timeZone: 'UTC' });
    }
    if (col.type === 'badge') {
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeClass(val, col)}`}>{val}</span>;
    }
    if (col.type === 'link') {
      return (
        <a href={val} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center justify-end">
          <ExternalLink className="w-4 h-4" />
        </a>
      );
    }
    return val;
  };

  const handleRowClick = (item: any) => {
    setDetailItem(item);
    setIsDetailModalOpen(true);
  };

  const formatTimestamp = (timestamp: number | string | Date) => {
    if (!timestamp) return '-';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return String(timestamp);
      return date.toLocaleString('es-ES');
    } catch (e) {
      return String(timestamp);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <button 
              onClick={handleAddNew}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Nuevo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                {columns.map((col, i) => (
                  <th key={i} className="py-3 px-4 font-medium">{col.header}</th>
                ))}
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      Cargando datos...
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-8 text-center text-gray-500">
                    No se encontraron registros.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr 
                    key={resolveId(item) || idx} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(item)} // Add click handler to row
                  >
                    {columns.map((col, i) => (
                      <td key={i} className="py-3 px-4">
                        {renderCell(item, col)}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors mr-2"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(item)} // Pass the entire item to resolveId dynamically
                        className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Editar Registro' : 'Nuevo Registro'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-sm text-red-700 font-medium">Error al guardar</p>
                  </div>
                  <p className="text-xs text-red-600 mt-1 pl-7">{errorMsg}</p>
                </div>
              )}

              {formFields.map((field, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.type === 'textarea' ? (
                    <textarea
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                      rows={4}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  ) : field.type === 'select' ? (
                    <div className="relative">
                      <input
                        list={`list-${field.name}`}
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                        placeholder="Seleccionar o escribir..."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                      />
                      <datalist id={`list-${field.name}`}>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      step={field.type === 'number' ? "0.1" : undefined}
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && detailItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50 rounded-t-lg">
              <h3 className="text-lg font-bold text-gray-900">Detalles de {title.slice(0, -1)}</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Main Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formFields.map((field, idx) => {
                  const value = detailItem[field.name];
                  if (value === undefined || value === null || value === '') return null; // Skip empty fields

                  // Custom rendering for certain types
                  let displayValue;
                  if (field.type === 'date') {
                    displayValue = formatTimestamp(value);
                  } else if (field.type === 'link') {
                    displayValue = (
                      <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        {value} <ExternalLink className="w-3 h-3" />
                      </a>
                    );
                  } else if (field.type === 'textarea') {
                    displayValue = <p className="whitespace-pre-wrap">{value}</p>;
                  } else {
                    displayValue = String(value);
                  }

                  return (
                    <div key={idx} className="bg-gray-50 p-3 rounded-md border border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase">{field.label}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-1">{displayValue}</p>
                    </div>
                  );
                })}
              </div>

              {/* History Section (createdAt, updatedAt) */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Historial de Registro</h4>
                
                {detailItem.createdAt && (
                  <div className="flex items-start gap-3 bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    <Clock className="w-4 h-4 text-indigo-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Fecha de Creación</p>
                      <p className="text-sm text-gray-700 font-semibold">{formatTimestamp(detailItem.createdAt)}</p>
                    </div>
                  </div>
                )}
                {detailItem.updatedAt && ( // Mongoose adds `updatedAt` for every save/update
                  <div className="flex items-start gap-3 bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    <Clock className="w-4 h-4 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Última Actualización</p>
                      <p className="text-sm text-gray-700 font-semibold">{formatTimestamp(detailItem.updatedAt)}</p>
                    </div>
                  </div>
                )}
                 {/* 
                 For generic ResourceManager items, activity logs with usernames 
                 are not present by default in the current backend schema.
                 The 'activity' field is specific to RiskTicket.
                 To add detailed activity and user tracking for these generic modules,
                 each schema (Incidente, Exploit, etc.) would need an 'activity' array
                 and the 'createCrudRoutesFor' function would need to be updated
                 to populate it with the authenticated user's username on every create/update.
                 */}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-lg">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
