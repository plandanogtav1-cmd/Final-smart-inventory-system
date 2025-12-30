import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, AlertTriangle, X, Eye } from 'lucide-react';

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  min_stock_threshold: number;
  reorder_point: number;
  supplier_id: string;
  supplier_name: string;
  supplier_email: string;
}

export default function SupplierEmailManager() {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  useEffect(() => {
    loadLowStockProducts();
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setSuppliers(data);
        if (data.length > 0 && !selectedSupplier) {
          setSelectedSupplier(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadLowStockProducts = async () => {
    try {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .lte('current_stock', 50);

      if (products && products.length > 0) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*');

        const lowStock = products.map(p => {
          const supplier = suppliers?.find(s => s.id === p.supplier_id) || suppliers?.[0];
          
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            current_stock: p.current_stock,
            min_stock_threshold: p.min_stock_threshold || 5,
            reorder_point: p.reorder_point || 10,
            supplier_id: supplier?.id || 'no-supplier',
            supplier_name: supplier?.name || 'No Supplier Assigned',
            supplier_email: supplier?.email || 'no-email@example.com'
          };
        });

        setLowStockProducts(lowStock);
      } else {
        setLowStockProducts([]);
      }
    } catch (error) {
      console.error('Error loading low stock products:', error);
    }
  };

  const generateEmailContent = (): string => {
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return '';

    const productList = lowStockProducts.map(p => 
      `- ${p.name} (${p.sku}): Current Stock: ${p.current_stock} units, Reorder: ${Math.max(p.reorder_point - p.current_stock, 10)} units`
    ).join('\n');

    return `Subject: Bulk Restock Request - ${lowStockProducts.length} Items

Dear ${supplier.name},

Our inventory shows that the following ${lowStockProducts.length} item(s) are running low or out of stock:

${productList}

Please confirm availability and expected delivery date for all items at your earliest convenience.
Thank you for your continued support.

Best regards,
Inventory Manager
Smart Inventory Solutions
inventory@smartinventory.com
+63 917 123 4567`;
  };

  const sendEmail = async (to: string, subject: string, html: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001'}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, html }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      return result;
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  };

  const sendBulkEmail = async () => {
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier || !supplier.email) {
      alert('Please select a supplier with a valid email address');
      return;
    }

    try {
      const subject = `Bulk Restock Request - ${lowStockProducts.length} Items`;
      const html = generateEmailContent().replace(/\n/g, '<br>');
      
      await sendEmail(supplier.email, subject, html);
      alert('✅ Email sent successfully!');
    } catch (error) {
      alert('❌ Failed to send email. Please try the copy/paste method.');
      console.error('Email error:', error);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Supplier Email Manager</h1>
          <p className="text-gray-400">Generate restock request emails for low inventory items</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300 font-medium">Supplier:</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} {supplier.email ? `(${supplier.email})` : '(No Email)'}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setShowPreview(true)}
            disabled={lowStockProducts.length === 0 || !selectedSupplier}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            <Eye className="w-5 h-5" />
            Generate Email ({lowStockProducts.length} items)
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-600/10 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-white font-semibold">Low Stock Items</h3>
          </div>
          <p className="text-3xl font-bold text-white">{lowStockProducts.length}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600/10 p-2 rounded-lg">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold">Email System</h3>
          </div>
          <p className="text-3xl font-bold text-white">Ready</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-600/10 p-2 rounded-lg">
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white font-semibold">Manual Copy/Paste</h3>
          </div>
          <p className="text-3xl font-bold text-white">Active</p>
        </div>
      </div>

      {/* Low Stock Products Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-white text-lg font-semibold">Products Requiring Restock</h3>
          <p className="text-gray-400 text-sm mt-1">Items with stock ≤ 50 units</p>
        </div>

        {lowStockProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {lowStockProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{product.name}</p>
                        <p className="text-gray-400 text-sm">{product.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-semibold">{product.current_stock} units</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{product.supplier_name}</p>
                        <p className="text-gray-400 text-sm">{product.supplier_email}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No low stock items found</p>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">Generated Email Content</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={sendBulkEmail}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  📧 Send Email Now
                </button>
                <button
                  onClick={() => {
                    const content = generateEmailContent();
                    navigator.clipboard.writeText(content).then(() => {
                      alert('✅ Email content copied! Paste it into your email client.');
                    }).catch(() => {
                      alert('Could not copy to clipboard. Please select and copy manually.');
                    });
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  📋 Copy Email Content
                </button>
                <p className="text-gray-400 text-sm">Send directly or copy and paste into Gmail, Outlook, or any email client</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono bg-gray-800 p-4 rounded-lg">
                  {generateEmailContent()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}