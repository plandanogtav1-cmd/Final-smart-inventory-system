import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Mail, Truck, CheckCircle, XCircle, AlertTriangle, ChevronDown, Send, Save } from 'lucide-react';

interface LowStockProduct {
  id: string;
  name: string;
  current_stock: number;
  min_stock_threshold: number;
  category: string;
  supplier_id: string;
  supplier: {
    name: string;
    email: string;
    lead_time_days: number;
  };
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  lead_time_days: number;
}

interface CategoryGroup {
  category: string;
  products: LowStockProduct[];
  selectedSupplier: string;
  customQuantities: Record<string, number>;
}

interface RestockOrder {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  expected_delivery_date: string;
  product: { name: string };
  supplier: { name: string; lead_time_days: number };
}

export default function AutomatedRestocking() {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [restockOrders, setRestockOrders] = useState<RestockOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryPreferences, setCategoryPreferences] = useState<Record<string, string>>({});
  const [deliveryNotification, setDeliveryNotification] = useState<{count: number, details: any[]} | null>(null);

  useEffect(() => {
    loadData();
    checkDeliveries();
  }, []);

  const checkDeliveries = async () => {
    try {
      const { data, error } = await supabase.rpc('process_deliveries_with_summary');
      if (error) throw error;
      
      if (data && data.length > 0) {
        const result = data[0];
        if (result.delivered_count > 0) {
          setDeliveryNotification({
            count: result.delivered_count,
            details: result.delivery_details || []
          });
        }
      }
    } catch (error) {
      console.error('Error checking deliveries:', error);
    }
  };

  const loadData = async () => {
    await Promise.all([loadLowStockProducts(), loadSuppliers(), loadRestockOrders()]);
  };

  const loadLowStockProducts = async () => {
    try {
      const { data: products } = await supabase
        .from('products')
        .select(`
          id, name, current_stock, min_stock_threshold, category, supplier_id,
          supplier:suppliers(name, email, lead_time_days)
        `)
        .eq('is_active', true);

      if (products) {
        const lowStock = products.filter(product => 
          product.current_stock <= product.min_stock_threshold && 
          product.supplier && 
          product.supplier.name
        );

        const grouped = lowStock.reduce((acc, product) => {
          const category = product.category || 'Other';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(product);
          return acc;
        }, {} as Record<string, LowStockProduct[]>);

        const { data: prefs } = await supabase
          .from('category_supplier_preferences')
          .select('category, supplier_id');

        const savedPrefs = prefs?.reduce((acc, pref) => {
          acc[pref.category] = pref.supplier_id;
          return acc;
        }, {} as Record<string, string>) || {};

        const groups = Object.entries(grouped).map(([category, products]) => ({
          category,
          products,
          selectedSupplier: savedPrefs[category] || products[0]?.supplier_id || '',
          customQuantities: products.reduce((acc, p) => {
            acc[p.id] = p.min_stock_threshold - p.current_stock + 5;
            return acc;
          }, {} as Record<string, number>)
        }));

        setCategoryGroups(groups);
        setCategoryPreferences(savedPrefs);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('id, name, email, lead_time_days')
        .eq('is_active', true);

      if (data) {
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadRestockOrders = async () => {
    try {
      const { data } = await supabase
        .from('purchase_orders')
        .select(`
          id, product_id, quantity, status, expected_delivery_date,
          product:products(name),
          supplier:suppliers(name, lead_time_days)
        `)
        .not('status', 'in', '("delivered","restocked")')
        .order('order_date', { ascending: false });

      if (data) {
        setRestockOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const updateSupplierForCategory = (category: string, supplierId: string) => {
    setCategoryGroups(prev => 
      prev.map(group => 
        group.category === category 
          ? { ...group, selectedSupplier: supplierId }
          : group
      )
    );
  };

  const updateQuantityForProduct = (category: string, productId: string, quantity: number) => {
    setCategoryGroups(prev => 
      prev.map(group => 
        group.category === category 
          ? { 
              ...group, 
              customQuantities: { 
                ...group.customQuantities, 
                [productId]: quantity 
              }
            }
          : group
      )
    );
  };

  const saveAllPreferences = async () => {
    setLoading(true);
    try {
      for (const group of categoryGroups) {
        if (group.selectedSupplier) {
          await supabase
            .from('category_supplier_preferences')
            .upsert({
              category: group.category,
              supplier_id: group.selectedSupplier,
              updated_at: new Date().toISOString()
            });
        }
      }
      alert('✅ Category preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('❌ Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const sendAllCategoryEmails = async () => {
    if (!window.confirm(`Send restock emails for all ${categoryGroups.length} categories?`)) {
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const group of categoryGroups) {
        if (group.selectedSupplier) {
          try {
            await sendCategoryRestockEmail(group);
            successCount++;
          } catch (error) {
            failCount++;
            console.error(`Failed to send email for ${group.category}:`, error);
          }
        }
      }
      
      if (successCount > 0 && failCount === 0) {
        alert(`✅ All restock emails sent successfully!\n\nSent ${successCount} emails to suppliers`);
      } else if (successCount > 0 && failCount > 0) {
        alert(`⚠️ Partially successful\n\nSent: ${successCount} emails\nFailed: ${failCount} emails`);
      } else {
        alert(`❌ All emails failed to send\n\nPlease check your internet connection and try again.`);
      }
    } catch (error) {
      console.error('Error sending all emails:', error);
      alert('❌ Unexpected error occurred while sending emails');
    } finally {
      setLoading(false);
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm('Delete all restock orders? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from('purchase_orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      loadData();
      alert('✅ All restock orders cleared!');
    } catch (error) {
      console.error('Error clearing orders:', error);
      alert('❌ Failed to clear orders');
    } finally {
      setLoading(false);
    }
  };

  const sendCategoryRestockEmail = async (group: CategoryGroup) => {
    if (!group.selectedSupplier) return;

    setLoading(true);
    try {
      const supplier = suppliers.find(s => s.id === group.selectedSupplier);
      if (!supplier) return;

      const orders = [];
      let emailMessage = `Dear ${supplier.name},\n\nWe need to restock the following ${group.category} products:\n\n`;

      for (const product of group.products) {
        const orderQuantity = group.customQuantities[product.id] || (product.min_stock_threshold - product.current_stock + 5);
        const orderDate = new Date();
        const expectedDeliveryDate = new Date();
        expectedDeliveryDate.setDate(orderDate.getDate() + supplier.lead_time_days);

        const { data: order } = await supabase
          .from('purchase_orders')
          .insert({
            supplier_id: group.selectedSupplier,
            product_id: product.id,
            quantity: orderQuantity,
            status: 'order_sent',
            order_date: orderDate.toISOString(),
            expected_delivery_date: expectedDeliveryDate.toISOString(),
            notes: `Bulk restock request for ${group.category} - ${product.name}`
          })
          .select()
          .single();

        if (order) {
          orders.push(order);
          emailMessage += `- ${product.name}: ${orderQuantity} units (Current: ${product.current_stock}, Min: ${product.min_stock_threshold})\n`;
        }
      }

      emailMessage += `\nTotal items: ${group.products.length}\nExpected delivery: ${supplier.lead_time_days} days\n\nPlease confirm availability and delivery schedule.\n\nBest regards,\nInventra Team`;

      const emailResponse = await fetch(`${import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001'}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: supplier.email,
          subject: `Bulk Restock Request - ${group.category} Products`,
          html: emailMessage.replace(/\n/g, '<br>')
        })
      });

      if (!emailResponse.ok) {
        throw new Error('Failed to send email');
      }

      alert(`✅ Restock email sent successfully to ${supplier.name}!\n\nEmail sent to: ${supplier.email}\nProducts: ${group.products.length} items\nTotal units: ${group.products.reduce((sum, p) => sum + (group.customQuantities[p.id] || (p.min_stock_threshold - p.current_stock + 5)), 0)}`);

      loadData();
    } catch (error) {
      console.error('Error sending bulk restock email:', error);
      alert(`❌ Failed to send email to ${supplier?.name || 'supplier'}\n\nPlease check your internet connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setLoading(true);
    try {
      await supabase
        .from('purchase_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      
      loadData();
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSupplierOrdersStatus = async (supplierName: string, status: string) => {
    if (!window.confirm(`Mark all orders from ${supplierName} as ${status.replace('_', ' ')}?`)) {
      return;
    }

    setLoading(true);
    try {
      const supplierOrders = restockOrders.filter(order => order.supplier?.name === supplierName);
      
      for (const order of supplierOrders) {
        await supabase
          .from('purchase_orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', order.id);
      }
      
      loadData();
      alert(`✅ Updated ${supplierOrders.length} orders from ${supplierName}`);
    } catch (error) {
      console.error('Error updating supplier orders:', error);
      alert('❌ Failed to update orders');
    } finally {
      setLoading(false);
    }
  };

  const markAsDelivered = async (orderId: string) => {
    if (!window.confirm('Mark this order as delivered and add to inventory?')) return;
    
    setLoading(true);
    try {
      const order = restockOrders.find(o => o.id === orderId);
      if (!order) return;
      
      const { data: productBefore } = await supabase
        .from('products')
        .select('name, current_stock')
        .eq('id', order.product_id)
        .single();
      
      // Mark order as delivered
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'confirmed',
          actual_delivery_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (orderError) {
        console.error('Order update error:', orderError);
        throw orderError;
      }
      
      // Update product stock
      const { error: productError } = await supabase
        .from('products')
        .update({ 
          current_stock: (productBefore?.current_stock || 0) + order.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.product_id);
      
      if (productError) {
        console.error('Product update error:', productError);
        throw productError;
      }
      
      // Create stock movement record
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: order.product_id,
          movement_type: 'purchase',
          quantity: order.quantity,
          previous_stock: productBefore?.current_stock || 0,
          new_stock: (productBefore?.current_stock || 0) + order.quantity,
          reference_id: orderId,
          notes: 'Manual delivery - Test'
        });
      
      if (movementError) {
        console.error('Movement error:', movementError);
      }
      
      // Get updated product stock
      const { data: productAfter } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', order.product_id)
        .single();
      
      // Reload data to refresh the UI
      await loadData();
      
      alert(`✅ Delivery Successful!\n\nProduct: ${productBefore?.name}\nQuantity Added: +${order.quantity} units\nStock Before: ${productBefore?.current_stock}\nStock After: ${productAfter?.current_stock}\n\n✅ Transaction completed successfully!`);
      
    } catch (error) {
      console.error('Error marking as delivered:', error);
      alert('❌ Failed to process delivery: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testDelivery = async (orderId: string) => {
    if (!window.confirm('Set this order as overdue for testing?')) return;
    
    setLoading(true);
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await supabase
        .from('purchase_orders')
        .update({ 
          expected_delivery_date: yesterday.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      loadData();
      alert('✅ Order set as overdue for testing!');
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'order_sent': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'in_transit': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'supplier_unavailable': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'order_sent': return <Mail className="w-3 h-3" />;
      case 'in_transit': return <Truck className="w-3 h-3" />;
      case 'supplier_unavailable': return <XCircle className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  };

  const getDaysRemaining = (expectedDeliveryDate: string) => {
    const deliveryDate = new Date(expectedDeliveryDate);
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="p-6 space-y-8">
      {deliveryNotification && (
        <div className="bg-green-900/50 border border-green-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-xl font-semibold text-green-300">🎉 Deliveries Processed!</h3>
                <p className="text-green-400">{deliveryNotification.count} orders delivered and added to inventory</p>
              </div>
            </div>
            <button
              onClick={() => setDeliveryNotification(null)}
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          <div className="grid gap-2">
            {deliveryNotification.details.map((item: any, index: number) => (
              <div key={index} className="bg-green-800/30 rounded-lg p-3 flex justify-between items-center">
                <span className="text-green-200 font-medium">{item.product_name}</span>
                <div className="text-right">
                  <span className="text-green-300">+{item.quantity} units</span>
                  <div className="text-green-400 text-sm">from {item.supplier_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Automated Restocking</h1>
          <p className="text-gray-400">Manage inventory restocking by category with bulk email orders</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={sendAllCategoryEmails}
            disabled={loading || categoryGroups.length === 0}
            className="px-4 lg:px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm lg:text-base"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send All Restock Orders</span>
            <span className="sm:hidden">Send All Orders</span>
          </button>
          <div className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-white font-medium text-sm lg:text-base">{categoryGroups.reduce((sum, group) => sum + group.products.length, 0)} items need restocking</span>
          </div>
          <button
            onClick={saveAllPreferences}
            disabled={loading}
            title="Save Preferences"
            className="p-2.5 text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      {categoryGroups.length > 0 ? (
        <div className="grid gap-6">
          {categoryGroups.map((group) => (
            <div key={group.category} className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 lg:p-6 border-b border-gray-700">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="bg-red-500/20 p-2 lg:p-3 rounded-xl">
                      <Package className="w-5 h-5 lg:w-6 lg:h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl font-semibold text-white">{group.category}</h3>
                      <p className="text-gray-400 text-sm lg:text-base">{group.products.length} products • Total needed: {group.products.reduce((sum, p) => sum + (p.min_stock_threshold - p.current_stock + 5), 0)} units</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-sm text-gray-300 font-medium">Supplier:</span>
                      <div className="relative">
                        <select
                          value={group.selectedSupplier}
                          onChange={(e) => updateSupplierForCategory(group.category, e.target.value)}
                          className="bg-gray-800 border border-gray-600 text-white px-3 lg:px-4 py-2 pr-8 lg:pr-10 rounded-xl appearance-none focus:outline-none focus:border-blue-500 w-full sm:min-w-[180px] lg:min-w-[200px] text-sm lg:text-base"
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name} ({supplier.lead_time_days}d)
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => sendCategoryRestockEmail(group)}
                      disabled={loading || !group.selectedSupplier}
                      className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm lg:text-base"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send Bulk Order</span>
                      <span className="sm:hidden">Send Order</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 lg:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                  {group.products.map((product) => (
                    <div key={product.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 lg:p-4 hover:bg-gray-800/70 transition-colors">
                      <h4 className="text-white font-medium mb-2 lg:mb-3 truncate text-sm lg:text-base">{product.name}</h4>
                      <div className="space-y-1.5 lg:space-y-2 text-xs lg:text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Current:</span>
                          <span className="text-red-400 font-medium">{product.current_stock}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Minimum:</span>
                          <span className="text-gray-300">{product.min_stock_threshold}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Order:</span>
                          <input
                            type="number"
                            min="1"
                            value={group.customQuantities[product.id] || (product.min_stock_threshold - product.current_stock + 5)}
                            onChange={(e) => updateQuantityForProduct(group.category, product.id, parseInt(e.target.value) || 1)}
                            className="w-12 lg:w-16 px-1.5 lg:px-2 py-1 bg-gray-700 border border-gray-600 text-white text-xs rounded focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">All Products Well Stocked</h3>
          <p className="text-gray-400">No products currently require restocking</p>
        </div>
      )}

      <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 lg:p-6 border-b border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 lg:p-3 rounded-xl">
                <Truck className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg lg:text-xl font-semibold text-white">Active Restock Orders</h3>
                <p className="text-gray-400 text-sm lg:text-base">{restockOrders.length} orders in progress</p>
              </div>
            </div>
            <button
              onClick={clearAllOrders}
              disabled={loading || restockOrders.length === 0}
              className="px-3 lg:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 text-sm lg:text-base"
            >
              Clear All Orders
            </button>
          </div>
        </div>

        {restockOrders.length > 0 ? (
          <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
            {Object.entries(
              restockOrders.reduce((acc, order) => {
                const supplierName = order.supplier?.name || 'Unknown Supplier';
                if (!acc[supplierName]) {
                  acc[supplierName] = [];
                }
                acc[supplierName].push(order);
                return acc;
              }, {} as Record<string, RestockOrder[]>)
            ).map(([supplierName, orders]) => (
              <div key={supplierName} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-800 p-3 lg:p-4 border-b border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-white font-semibold text-sm lg:text-base">{supplierName}</h4>
                      <p className="text-gray-400 text-xs lg:text-sm">{orders.length} orders • Total: {orders.reduce((sum, o) => sum + o.quantity, 0)} units</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {orders.some(o => o.status === 'order_sent') && (
                        <>
                          <button
                            onClick={() => updateSupplierOrdersStatus(supplierName, 'in_transit')}
                            disabled={loading}
                            className="px-2 lg:px-3 py-1 lg:py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            All On Way
                          </button>
                          <button
                            onClick={() => updateSupplierOrdersStatus(supplierName, 'supplier_unavailable')}
                            disabled={loading}
                            className="px-2 lg:px-3 py-1 lg:py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            All Unavailable
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-2 p-3 lg:p-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-700/50 p-2 lg:p-3 rounded-lg gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-white font-medium text-sm lg:text-base truncate block">{order.product?.name || 'Unknown Product'}</span>
                        <span className="text-gray-400 text-xs lg:text-sm">({order.quantity} units)</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)} whitespace-nowrap`}>
                          {getStatusIcon(order.status)}
                          {order.status === 'supplier_unavailable' ? 'cancelled' : 
                           order.status === 'confirmed' ? 'delivered' : 
                           order.status.replace('_', ' ')}
                        </span>
                        {order.status === 'order_sent' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateOrderStatus(order.id, 'in_transit')}
                              disabled={loading}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                            >
                              On Way
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'supplier_unavailable')}
                              disabled={loading}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                            >
                              Unavailable
                            </button>
                          </div>
                        )}
                        {order.status === 'in_transit' && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="text-yellow-400 text-xs font-medium text-center sm:text-left">
                              {(() => {
                                const daysLeft = getDaysRemaining(order.expected_delivery_date);
                                if (daysLeft > 1) return `Arriving in ${daysLeft} days`;
                                if (daysLeft === 1) return 'Arriving tomorrow';
                                if (daysLeft === 0) return 'Delivery today';
                                return 'Delivery overdue';
                              })()} 
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => markAsDelivered(order.id)}
                                disabled={loading}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                              >
                                Mark Received
                              </button>
                              <button
                                onClick={() => updateOrderStatus(order.id, 'supplier_unavailable')}
                                disabled={loading}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">No Active Orders</h4>
            <p className="text-gray-400">All restock orders have been completed or cleared</p>
          </div>
        )}
      </div>
    </div>
  );
}