import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Plus, Scan, Check, X, Search } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  category: string;
  unit_price: number;
}

interface ReceiveItem {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  quantity_received: number;
}

export default function StockReceiving() {
  const [products, setProducts] = useState<Product[]>([]);
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (data) setProducts(data);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
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
        sku: product.sku,
        current_stock: product.current_stock,
        quantity_received: 1
      }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
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
      // Update stock levels
      for (const item of receiveItems) {
        const { error } = await supabase
          .from('products')
          .update({ 
            current_stock: item.current_stock + item.quantity_received 
          })
          .eq('id', item.product_id);

        if (error) throw error;

        // Record stock movement
        await supabase
          .from('stock_movements')
          .insert({
            product_id: item.product_id,
            movement_type: 'in',
            quantity: item.quantity_received,
            reason: 'Stock Receiving',
            notes: `Received ${item.quantity_received} units`
          });
      }

      alert(`✅ Successfully received ${receiveItems.length} products!`);
      setReceiveItems([]);
      loadProducts();
    } catch (error) {
      console.error('Error processing stock receiving:', error);
      alert('❌ Error processing stock receiving');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    const product = products.find(p => p.sku === barcode);
    if (product) {
      addToReceive(product);
      setSearchTerm('');
    } else {
      alert(`Product with barcode ${barcode} not found`);
    }
  };

  const totalItems = receiveItems.reduce((sum, item) => sum + item.quantity_received, 0);

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Stock Receiving</h1>
          <p className="text-gray-400">Update inventory when new stocks arrive</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScanMode(!scanMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              scanMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Scan className="w-4 h-4" />
            Scan Mode
          </button>
          {receiveItems.length > 0 && (
            <button
              onClick={processReceiving}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Process ({totalItems} items)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Search */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Select Products</h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={scanMode ? "Scan barcode or search..." : "Search products..."}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && scanMode && searchTerm) {
                  handleBarcodeScan(searchTerm);
                }
              }}
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all cursor-pointer"
                onClick={() => addToReceive(product)}
              >
                <div className="flex-1">
                  <h3 className="font-medium text-white">{product.name}</h3>
                  <p className="text-sm text-gray-400">
                    SKU: {product.sku} • Stock: {product.current_stock} • {product.category}
                  </p>
                </div>
                <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Receiving List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Receiving List ({receiveItems.length} products)
          </h2>

          {receiveItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No products selected for receiving</p>
              <p className="text-sm text-gray-500 mt-1">Search and click products to add them</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {receiveItems.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{item.product_name}</h3>
                    <p className="text-sm text-gray-400">
                      Current: {item.current_stock} → New: {item.current_stock + item.quantity_received}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity_received - 1)}
                      className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantity_received}
                      onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center"
                      min="1"
                    />
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity_received + 1)}
                      className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => updateQuantity(item.product_id, 0)}
                      className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded flex items-center justify-center ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {receiveItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Total Products:</span>
                <span>{receiveItems.length}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-white">
                <span>Total Units:</span>
                <span>{totalItems}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {scanMode && (
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Scan className="w-4 h-4" />
            <span className="font-medium">Scan Mode Active</span>
          </div>
          <p className="text-sm text-blue-300">
            Scan product barcodes or type SKU in the search box and press Enter to quickly add products.
          </p>
        </div>
      )}
    </div>
  );
}