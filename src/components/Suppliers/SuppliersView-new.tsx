import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Truck, Star, Mail, Plus, X, Edit, Trash2 } from 'lucide-react';
import SupplierEmailManager from './SupplierEmailManager';

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  lead_time_days: number;
  rating: number;
  is_active: boolean;
}

export default function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'emails'>('suppliers');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    lead_time_days: 7,
    rating: 5.0
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .order('rating', { ascending: false });

    if (data) {
      setSuppliers(data);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('suppliers')
        .insert([{
          ...formData,
          is_active: true
        }]);

      if (error) throw error;

      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        lead_time_days: 7,
        rating: 5.0
      });
      setShowAddModal(false);
      loadSuppliers();
      alert('Supplier added successfully!');
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('Failed to add supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Suppliers</h1>
          <p className="text-gray-400">Manage supplier relationships and automated restock emails</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Add Supplier Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-lg shadow-green-600/30"
          >
            <Plus className="w-5 h-5" />
            Add Supplier
          </button>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'suppliers'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4 inline mr-2" />
              Suppliers
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'emails'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-2" />
              Email Manager
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'suppliers' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600/10 p-2 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold">Total Suppliers</h3>
              </div>
              <p className="text-3xl font-bold text-white mt-4">{suppliers.length}</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-600/10 p-2 rounded-lg">
                  <Truck className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-white font-semibold">Active Suppliers</h3>
              </div>
              <p className="text-3xl font-bold text-white mt-4">
                {suppliers.filter(s => s.is_active).length}
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-yellow-600/10 p-2 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-white font-semibold">Avg Rating</h3>
              </div>
              <p className="text-3xl font-bold text-white mt-4">
                {suppliers.length > 0
                  ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(2)
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Supplier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Lead Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Rating</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{supplier.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-gray-300 text-sm">{supplier.contact_person}</p>
                        <p className="text-gray-500 text-xs">{supplier.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{supplier.lead_time_days} days</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-semibold">{supplier.rating.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        supplier.is_active
                          ? 'bg-green-600/10 text-green-400'
                          : 'bg-gray-600/10 text-gray-400'
                      }`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setFormData({
                              name: supplier.name,
                              contact_person: supplier.contact_person,
                              email: supplier.email,
                              phone: supplier.phone,
                              address: '',
                              lead_time_days: supplier.lead_time_days,
                              rating: supplier.rating
                            });
                            setShowAddModal(true);
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete "${supplier.name}"?`)) {
                              await supabase.from('suppliers').delete().eq('id', supplier.id);
                              loadSuppliers();
                            }
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      ) : (
        <SupplierEmailManager />
      )}

      {/* Add/Edit Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSupplier(null);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              
              if (editingSupplier) {
                await supabase.from('suppliers').update(formData).eq('id', editingSupplier.id);
              } else {
                await supabase.from('suppliers').insert([{ ...formData, is_active: true }]);
              }
              
              setFormData({ name: '', contact_person: '', email: '', phone: '', address: '', lead_time_days: 7, rating: 5.0 });
              setShowAddModal(false);
              setEditingSupplier(null);
              loadSuppliers();
              setLoading(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contact Person</label>
                <input
                  type="text"
                  required
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Contact person name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="supplier@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="09171234567"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 7 })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 5.0 })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSupplier(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-green-600/30"
                >
                  {loading ? (editingSupplier ? 'Updating...' : 'Adding...') : (editingSupplier ? 'Update' : 'Add Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}