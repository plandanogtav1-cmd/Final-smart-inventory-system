import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Filter, Edit, Trash2, Package, PackagePlus, Minus } from 'lucide-react';
import ProductModal from './ProductModal';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit_price: number;
  cost_price: number;
  current_stock: number;
  min_stock_threshold: number;
  reorder_point: number;
  is_active: boolean;
}

interface ReceiveItem {
  product_id: string;
  product_name: string;
  current_stock: number;
  quantity_received: number;
}

export default function InventoryView() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Stock receiving state
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
  const [receivingSearch, setReceivingSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, stockFilter]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setProducts(data);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (stockFilter === 'low') {
      filtered = filtered.filter(p => p.current_stock <= p.min_stock_threshold);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(p => p.current_stock === 0);
    } else if (stockFilter === 'reorder') {
      filtered = filtered.filter(p => p.current_stock <= p.reorder_point);
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (product: Product) => {
    if (product.current_stock === 0) {
      return { label: 'Out of Stock', color: 'text-red-400 bg-red-500/10' };
    } else if (product.current_stock <= product.min_stock_threshold) {
      return { label: 'Low Stock', color: 'text-orange-400 bg-orange-500/10' };
    } else if (product.current_stock <= product.reorder_point) {
      return { label: 'Reorder Soon', color: 'text-yellow-400 bg-yellow-500/10' };
    }
    return { label: 'In Stock', color: 'text-green-400 bg-green-500/10' };
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await supabase.from('products').delete().eq('id', id);
      loadProducts();
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  // Stock receiving functions
  const filteredReceivingProducts = products.filter(p =>
    p.name.toLowerCase().includes(receivingSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(receivingSearch.toLowerCase())
  );

  const addToReceive = (product: Product) => {
    const existing = receiveItems.find(item => item.product_id === product.id);
    if (existing) {
      setReceiveItems(receiveItems.map(item =>
        item.product_id === product.id
          ? { ...item, quantity_received: item.quantity_received + 1 }
          : item
      ));
    } else {
      setReceiveItems([...receiveItems, {
        product_id: product.id,
        product_name: product.name,
        current_stock: product.current_stock,
        quantity_received: 1
      }]);
    }
  };

  const updateReceiveQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setReceiveItems(receiveItems.filter(item => item.product_id !== productId));
    } else {
      setReceiveItems(receiveItems.map(item =>
        item.product_id === productId
          ? { ...item, quantity_received: quantity }
          : item
      ));
    }
  };

  const processReceiving = async () => {
    if (receiveItems.length === 0) return;

    setLoading(true);
    try {
      for (const item of receiveItems) {
        await supabase
          .from('products')
          .update({ 
            current_stock: item.current_stock + item.quantity_received 
          })
          .eq('id', item.product_id);

        await supabase
          .from('stock_movements')
          .insert({
            product_id: item.product_id,
            movement_type: 'in',
            quantity: item.quantity_received,
            reason: 'Manual Restock',
            notes: `Manually restocked ${item.quantity_received} units`
          });
      }

      alert(`✅ Successfully restocked ${receiveItems.length} products!`);
      setReceiveItems([]);
      loadProducts();
    } catch (error) {
      alert('❌ Error processing manual restock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Inventory Management</h1>
          <p className="text-gray-400">Track and manage your product inventory</p>
        </div>
        {activeTab === 'products' && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        )}
        {activeTab === 'receiving' && receiveItems.length > 0 && (
          <button
            onClick={processReceiving}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            <PackagePlus className="w-5 h-5" />
            Process ({receiveItems.reduce((sum, item) => sum + item.quantity_received, 0)} items)
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'products'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Products
        </button>
        <button
          onClick={() => setActiveTab('receiving')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'receiving'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          Manual Restock
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
              >
                <option value="all">All Stock Levels</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
                <option value="reorder">Need Reorder</option>
              </select>
            </div>
          </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Value</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const totalValue = product.current_stock * product.unit_price;

                  return (
                    <tr key={product.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 font-mono text-sm">{product.sku}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300">{product.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-semibold">{product.current_stock}</div>
                        <div className="text-xs text-gray-500">
                          Min: {product.min_stock_threshold} | Reorder: {product.reorder_point}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300">₱{product.unit_price.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-semibold">₱{totalValue.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowModal(true);
                            }}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        <>
          {/* Stock Receiving Tab */}
          <div className="h-screen bg-gray-950 text-white">
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 lg:p-6 lg:flex lg:flex-row min-h-0 pb-96 lg:pb-0">
                {/* Left Side - Products */}
                <div className="flex-1 lg:pr-6 flex flex-col min-h-0">
                  {/* Product Search */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={receivingSearch}
                        onChange={(e) => setReceivingSearch(e.target.value)}
                        placeholder="Search products by name or SKU..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Products Grid */}
                  <div className="flex-1 overflow-y-auto pb-96 lg:pb-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
                      {filteredReceivingProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => addToReceive(product)}
                          className="bg-gray-800 p-3 lg:p-4 rounded-lg hover:bg-gray-700 text-left transition-all border border-gray-700 hover:border-gray-600"
                        >
                          <div className="mb-2">
                            <h3 className="font-medium text-xs lg:text-sm text-white truncate">{product.name}</h3>
                            <p className="text-xs text-gray-400">{product.sku}</p>
                          </div>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-blue-400 font-semibold text-sm lg:text-base">Stock: {product.current_stock}</p>
                              <p className="text-xs text-gray-500">{product.category}</p>
                            </div>
                            <Plus className="w-3 lg:w-4 h-3 lg:h-4 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {filteredReceivingProducts.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-400">No products found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side - Receiving List (Desktop) */}
                <div className="hidden lg:flex lg:w-96 bg-gray-900 border-l border-gray-800 flex-col">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <PackagePlus className="w-5 h-5" />
                      <h2 className="text-lg font-semibold">Manual Restock ({receiveItems.length})</h2>
                    </div>
                  </div>

                  {/* Receiving Items */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {receiveItems.length === 0 ? (
                      <div className="text-center py-12">
                        <PackagePlus className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No products selected</p>
                        <p className="text-gray-500 text-sm">Click products to add them</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {receiveItems.map(item => (
                          <div key={item.product_id} className="bg-gray-800 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className="font-medium text-sm">{item.product_name}</h3>
                                <p className="text-xs text-gray-400">
                                  Current: {item.current_stock} → New: {item.current_stock + item.quantity_received}
                                </p>
                              </div>
                              <button
                                onClick={() => updateReceiveQuantity(item.product_id, 0)}
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateReceiveQuantity(item.product_id, item.quantity_received - 1)}
                                  className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600 flex items-center justify-center"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                
                                <input
                                  type="number"
                                  value={item.quantity_received}
                                  onChange={(e) => {
                                    const newQty = parseInt(e.target.value) || 1;
                                    if (newQty > 0) {
                                      updateReceiveQuantity(item.product_id, newQty);
                                    }
                                  }}
                                  className="w-12 text-center bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                  min="1"
                                />
                                
                                <button
                                  onClick={() => updateReceiveQuantity(item.product_id, item.quantity_received + 1)}
                                  className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600 flex items-center justify-center"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-white font-semibold">+{item.quantity_received}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Process Button */}
                  {receiveItems.length > 0 && (
                    <div className="p-6 border-t border-gray-800">
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total Units:</span>
                          <span>{receiveItems.reduce((sum, item) => sum + item.quantity_received, 0)}</span>
                        </div>
                      </div>

                      <button
                        onClick={processReceiving}
                        disabled={loading}
                        className="w-full bg-green-600 p-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                      >
                        <PackagePlus className="w-5 h-5" />
                        {loading ? 'Processing...' : `Restock ${receiveItems.reduce((sum, item) => sum + item.quantity_received, 0)} Items`}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Receiving Section */}
              <div className="lg:hidden bg-gray-900 border-t border-gray-800 p-4 fixed bottom-0 left-0 right-0 z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">Manual Restock ({receiveItems.length})</h2>
                  </div>
                  {receiveItems.length > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Total:</p>
                      <p className="text-lg font-bold">{receiveItems.reduce((sum, item) => sum + item.quantity_received, 0)} units</p>
                    </div>
                  )}
                </div>

                {receiveItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No products selected</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-32 overflow-y-auto mb-4">
                      <div className="space-y-2">
                        {receiveItems.map(item => (
                          <div key={item.product_id} className="bg-gray-800 p-2 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-sm">{item.product_name}</h3>
                              <p className="text-xs text-gray-400">+{item.quantity_received} units</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateReceiveQuantity(item.product_id, item.quantity_received - 1)}
                                className="w-6 h-6 bg-gray-700 rounded hover:bg-gray-600 flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm w-8 text-center">{item.quantity_received}</span>
                              <button
                                onClick={() => updateReceiveQuantity(item.product_id, item.quantity_received + 1)}
                                className="w-6 h-6 bg-gray-700 rounded hover:bg-gray-600 flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => updateReceiveQuantity(item.product_id, 0)}
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={processReceiving}
                      disabled={loading || receiveItems.length === 0}
                      className="w-full bg-green-600 p-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                    >
                      <PackagePlus className="w-5 h-5" />
                      {loading ? 'Processing...' : `Restock ${receiveItems.reduce((sum, item) => sum + item.quantity_received, 0)} Items`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            loadProducts();
            setShowModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
