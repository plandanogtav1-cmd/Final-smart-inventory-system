import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RotateCcw, Search, Package, User, Calendar, DollarSign } from 'lucide-react';

interface Sale {
  id: string;
  product_id: string;
  customer_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at: string;
  product_name: string;
  customer_name: string;
}

interface Return {
  id: string;
  original_sale_id: string;
  product_name: string;
  customer_name: string;
  quantity: number;
  total_amount: number;
  return_reason: string;
  created_at: string;
}

export default function ReturnsView() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'history'>('process');

  useEffect(() => {
    loadSales();
    loadReturns();
  }, []);

  const loadSales = async () => {
    const { data: salesData } = await supabase
      .from('sales')
      .select(`
        id, product_id, customer_id, quantity, unit_price, total_amount, created_at,
        products(name),
        customers(name)
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (salesData) {
      const enriched = salesData.map(sale => ({
        ...sale,
        product_name: sale.products?.name || 'Unknown Product',
        customer_name: sale.customers?.name || 'Walk-in Customer'
      }));
      setSales(enriched);
    }
  };

  const loadReturns = async () => {
    const { data: returnsData } = await supabase
      .from('returns')
      .select(`
        id, original_sale_id, quantity, total_amount, return_reason, created_at,
        products(name),
        customers(name)
      `)
      .order('created_at', { ascending: false });

    if (returnsData) {
      const enriched = returnsData.map(ret => ({
        ...ret,
        product_name: ret.products?.name || 'Unknown Product',
        customer_name: ret.customers?.name || 'Walk-in Customer'
      }));
      setReturns(enriched);
    }
  };

  const processReturn = async () => {
    if (!selectedSale || returnQuantity <= 0 || returnQuantity > selectedSale.quantity) return;

    setLoading(true);
    try {
      const returnAmount = (selectedSale.unit_price * returnQuantity);

      const { error } = await supabase
        .from('returns')
        .insert([{
          user_id: user?.id,
          original_sale_id: selectedSale.id,
          product_id: selectedSale.product_id,
          customer_id: selectedSale.customer_id,
          quantity: returnQuantity,
          unit_price: selectedSale.unit_price,
          total_amount: returnAmount,
          return_reason: returnReason || 'Customer return'
        }]);

      if (!error) {
        alert('✅ Return processed successfully! Stock has been restored.');
        setSelectedSale(null);
        setReturnQuantity(1);
        setReturnReason('');
        loadSales();
        loadReturns();
      } else {
        alert('❌ Failed to process return.');
      }
    } catch (error) {
      alert('❌ Error processing return.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Returns Management</h1>
        <p className="text-gray-400">Process customer returns and restore inventory</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('process')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'process'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Process Returns
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Return History
        </button>
      </div>

      {activeTab === 'process' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales List */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Recent Sales</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by product or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedSale?.id === sale.id
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{sale.product_name}</h4>
                      <p className="text-gray-400 text-sm">{sale.customer_name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Qty: {sale.quantity}</span>
                        <span>₱{sale.total_amount.toLocaleString()}</span>
                        <span>{new Date(sale.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Process Return</h3>
            
            {selectedSale ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="text-white font-medium mb-2">Selected Sale</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">Product: {selectedSale.product_name}</p>
                    <p className="text-gray-300">Customer: {selectedSale.customer_name}</p>
                    <p className="text-gray-300">Original Qty: {selectedSale.quantity}</p>
                    <p className="text-gray-300">Unit Price: ₱{selectedSale.unit_price}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Return Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedSale.quantity}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Return Reason (Optional)
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Defective, wrong item, customer changed mind..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    Return Amount: ₱{(selectedSale.unit_price * returnQuantity).toLocaleString()}
                  </p>
                  <p className="text-blue-300 text-xs mt-1">
                    Stock will be restored automatically
                  </p>
                </div>

                <button
                  onClick={processReturn}
                  disabled={loading || returnQuantity <= 0 || returnQuantity > selectedSale.quantity}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {loading ? 'Processing...' : 'Process Return'}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a sale to process return</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Return History */
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-white text-lg font-semibold mb-4">Return History</h3>
          
          <div className="space-y-3">
            {returns.map((ret) => (
              <div key={ret.id} className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{ret.product_name}</h4>
                    <p className="text-gray-400 text-sm">{ret.customer_name}</p>
                    {ret.return_reason && (
                      <p className="text-gray-500 text-sm mt-1">Reason: {ret.return_reason}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Qty: {ret.quantity}</span>
                      <span>₱{ret.total_amount.toLocaleString()}</span>
                      <span>{new Date(ret.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-green-400 text-sm">
                    ✅ Completed
                  </div>
                </div>
              </div>
            ))}
            
            {returns.length === 0 && (
              <div className="text-center py-12">
                <RotateCcw className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No returns processed yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}