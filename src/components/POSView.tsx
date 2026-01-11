import React, { useState, useEffect } from 'react';
import { Scan, ShoppingCart, Plus, Minus, Trash2, CreditCard, History, X, Search, RotateCcw } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';
import { supabase } from '../lib/supabase';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  unit_price: number;
  current_stock: number;
  sku: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Sale {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  payment_method: string;
  has_return: boolean;
}

export default function POSView() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [productSearch, setProductSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale' | 'regular'>('regular');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const { isOnline, addPendingAction, getLocalData, setLocalData } = useOffline();
  const { user } = useAuth();

  useEffect(() => {
    fetchProducts();
    loadRecentSales();
  }, []);

  useEffect(() => {
    if (productSearch) {
      setFilteredProducts(
        products.filter(p => 
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku.toLowerCase().includes(productSearch.toLowerCase())
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [productSearch, products]);

  const fetchProducts = async () => {
    if (isOnline) {
      const { data } = await supabase
        .from('products')
        .select('id, name, unit_price, current_stock, sku')
        .eq('is_active', true);
      
      if (data) {
        setProducts(data);
        setLocalData('products', data);
      }
    } else {
      const cachedProducts = getLocalData('products');
      if (cachedProducts) {
        setProducts(cachedProducts);
      }
    }
  };

  const loadRecentSales = async () => {
    const { data: salesData } = await supabase
      .from('sales')
      .select('id, product_id, quantity, unit_price, total_amount, sale_date, payment_method, customer_id')
      .eq('status', 'completed')
      .order('sale_date', { ascending: false })
      .limit(20);

    if (salesData) {
      // Get returns data to check which sales have been returned
      const saleIds = salesData.map(s => s.id);
      const { data: returnsData } = await supabase
        .from('returns')
        .select('original_sale_id')
        .in('original_sale_id', saleIds);
      
      const returnedSaleIds = new Set(returnsData?.map(r => r.original_sale_id) || []);
      
      const productIds = [...new Set(salesData.map(s => s.product_id))];
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      if (productsData) {
        const productMap = productsData.reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);

        const enrichedSales = salesData.map(sale => ({
          id: sale.id,
          product_id: sale.product_id,
          product_name: productMap[sale.product_id] || 'Unknown Product',
          quantity: sale.quantity,
          unit_price: sale.unit_price,
          total_amount: sale.total_amount,
          sale_date: sale.sale_date,
          payment_method: sale.payment_method,
          has_return: returnedSaleIds.has(sale.id)
        }));

        setRecentSales(enrichedSales);
      }
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    // Try to find product by SKU (since we don't have barcode field)
    const product = products.find(p => p.sku === barcode || p.name.toLowerCase().includes(barcode.toLowerCase()));
    if (product) {
      addToCart(product);
      alert(`Added: ${product.name}`);
    } else {
      alert(`Product not found for code: ${barcode}`);
    }
    setScannerOpen(false);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const getDiscountAmount = () => {
    const subtotal = getSubtotal();
    if (discountType === 'percentage') {
      return subtotal * (discountValue / 100);
    }
    return Math.min(discountValue, subtotal);
  };

  const getTotal = () => {
    return Math.max(0, getSubtotal() - getDiscountAmount());
  };

  const processReturn = async (sale: Sale) => {
    if (!user?.id) {
      alert('❌ User not authenticated');
      return;
    }
    
    const returnQuantity = prompt(`Return quantity for ${sale.product_name}\nMax: ${sale.quantity}`);
    if (!returnQuantity || parseInt(returnQuantity) <= 0 || parseInt(returnQuantity) > sale.quantity) return;
    
    const qty = parseInt(returnQuantity);
    const returnAmount = sale.unit_price * qty;
    
    try {
      const { error } = await supabase
        .from('returns')
        .insert([{
          user_id: user.id,
          original_sale_id: sale.id,
          product_id: sale.product_id,
          customer_id: null,
          quantity: qty,
          unit_price: sale.unit_price,
          total_amount: returnAmount,
          return_reason: 'Customer return'
        }]);
      
      if (error) {
        console.error('Return error:', error);
        alert(`❌ Failed to process return: ${error.message}`);
      } else {
        alert(`✅ Return processed! ${qty} units returned, ₱${returnAmount.toFixed(2)} refunded. Stock restored.`);
        loadRecentSales();
        fetchProducts();
      }
    } catch (error) {
      console.error('Return error:', error);
      alert('❌ Error processing return.');
    }
  };

  const processPayment = async () => {
    if (cart.length === 0) return;

    console.log('Processing payment with customer:', customerName);
    setLoading(true);
    
    try {
      let customerId = null;
      
      // Create or find customer if name is provided
      if (customerName.trim()) {
        console.log('Creating customer:', customerName.trim());
        
        // First check if customer already exists (case insensitive)
        const { data: existingCustomers } = await supabase
          .from('customers')
          .select('id')
          .ilike('name', customerName.trim());
        
        if (existingCustomers && existingCustomers.length > 0) {
          customerId = existingCustomers[0].id;
          console.log('Found existing customer with ID:', customerId);
        } else {
          // Create new customer
          const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert({
              name: customerName.trim(),
              email: customerEmail.trim() || null,
              phone: customerPhone.trim() || null,
              customer_type: customerType,
              total_purchases: 0
            })
            .select('id')
            .single();
          
          if (newCustomer) {
            customerId = newCustomer.id;
            console.log('Customer created with ID:', customerId);
          } else {
            console.log('Customer creation failed:', error);
          }
        }
      }

      if (isOnline) {
        // Online: Process normally
        const salesPromises = cart.map(async (item) => {
          console.log('Creating sale with customer_id:', customerId);
          const saleResult = await supabase
            .from('sales')
            .insert({
              product_id: item.id,
              customer_id: customerId,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_amount: item.unit_price * item.quantity,
              sale_date: new Date().toISOString(),
              payment_method: paymentMethod,
              status: 'completed'
            })
            .select();
          
          console.log('Sale result:', saleResult);
          return saleResult;
        });

        const salesResults = await Promise.all(salesPromises);
        console.log('Sales created:', salesResults);

        // Update customer total_purchases manually since trigger might not be working
        if (customerId) {
          const finalAmountWithTax = getTotal() * 1.0875; // Include tax in customer lifetime value
          const { data: currentCustomer } = await supabase
            .from('customers')
            .select('total_purchases')
            .eq('id', customerId)
            .single();
          
          if (currentCustomer) {
            await supabase
              .from('customers')
              .update({ 
                total_purchases: currentCustomer.total_purchases + finalAmountWithTax
              })
              .eq('id', customerId);
          }
        }

        const stockUpdates = cart.map(item => 
          supabase
            .from('products')
            .update({ 
              current_stock: item.current_stock - item.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
        );

        await Promise.all(stockUpdates);
        await loadRecentSales();
        await fetchProducts();
      } else {
        // Offline: Store for later sync
        cart.forEach(item => {
          const saleData = {
            product_id: item.id,
            customer_id: customerId,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_amount: item.unit_price * item.quantity,
            discount_amount: (item.unit_price * item.quantity) * (getDiscountAmount() / getSubtotal()),
            created_at: new Date().toISOString(),
            payment_method: paymentMethod,
            status: 'completed',
            new_stock: item.current_stock - item.quantity
          };
          
          addPendingAction({
            type: 'sale',
            data: saleData
          });
          
          // Also queue customer update
          if (customerId) {
            const itemDiscountedAmount = (item.unit_price * item.quantity) * (getTotal() / getSubtotal());
            addPendingAction({
              type: 'customer_update',
              data: {
                customer_id: customerId,
                amount_to_add: itemDiscountedAmount
              }
            });
          }
        });

        // Update local stock immediately
        const updatedProducts = products.map(product => {
          const cartItem = cart.find(item => item.id === product.id);
          if (cartItem) {
            return { ...product, current_stock: product.current_stock - cartItem.quantity };
          }
          return product;
        });
        setProducts(updatedProducts);
        setLocalData('products', updatedProducts);
      }

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerType('regular');
      setDiscountValue(0);
      setDiscountType('percentage');
      
      const customerInfo = customerName ? ` for ${customerName} (${customerType})` : '';
      alert(`✅ Transaction Successful${customerInfo}! ${cart.length} items sold for ₱${(getTotal() * 1.0875).toFixed(2)}${!isOnline ? ' (Will sync when online)' : ''}`);
      
      // Show virtual receipt after success message
      const receiptInfo = {
        items: [...cart],
        subtotal: getSubtotal(),
        discountAmount: getDiscountAmount(),
        discountType,
        discountValue,
        tax: getTotal() * 0.0875,
        total: getTotal() * 1.0875,
        paymentMethod,
        customerName: customerName || 'Walk-in Customer',
        customerType,
        customerPhone,
        date: new Date().toLocaleString(),
        receiptNo: `RCP-${Date.now()}`
      };
      
      setTimeout(() => {
        setReceiptData(receiptInfo);
        setShowReceipt(true);
      }, 500);
      
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="h-screen bg-gray-950 text-white">
      <div className="h-full flex flex-col">
        {/* Products Section */}
        <div className="flex-1 p-4 lg:p-6 lg:flex lg:flex-row min-h-0 pb-96 lg:pb-0">
          {/* Left Side - Products */}
          <div className="flex-1 lg:pr-6 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h1 className="text-xl lg:text-2xl font-bold">Point of Sale</h1>
              <div className="flex items-center gap-2 lg:gap-3">
                <button
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) loadRecentSales();
                  }}
                  className="bg-gray-700 px-3 lg:px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2 text-sm lg:text-base"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                </button>
                <button
                  onClick={() => setScannerOpen(true)}
                  className="bg-blue-600 px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm lg:text-base"
                >
                  <Scan className="w-4 h-4" />
                  <span className="hidden sm:inline">Scan</span>
                </button>
              </div>
            </div>

            {/* Product Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto pb-96 lg:pb-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.current_stock === 0}
                    className="bg-gray-800 p-3 lg:p-4 rounded-lg hover:bg-gray-700 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-600"
                  >
                    <div className="mb-2">
                      <h3 className="font-medium text-xs lg:text-sm text-white truncate">{product.name}</h3>
                      <p className="text-xs text-gray-400">{product.sku}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-green-400 font-semibold text-sm lg:text-base">₱{product.unit_price}</p>
                        <p className="text-xs text-gray-500">Stock: {product.current_stock}</p>
                      </div>
                      <Plus className="w-3 lg:w-4 h-3 lg:h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
              
              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No products found</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Cart & Checkout (Desktop) */}
          <div className="hidden lg:flex lg:w-96 bg-gray-900 border-l border-gray-800 flex-col">
            {/* Cart Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Cart ({cart.length})</h2>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Cart is empty</p>
                  <p className="text-gray-500 text-sm">Add products to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-800 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{item.name}</h3>
                          <p className="text-xs text-gray-400">₱{item.unit_price} each</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              if (newQty > 0 && newQty <= item.current_stock) {
                                updateQuantity(item.id, newQty);
                              }
                            }}
                            className="w-12 text-center bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                          />
                          
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.current_stock}
                            className="w-8 h-8 bg-gray-700 rounded hover:bg-gray-600 flex items-center justify-center disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-white font-semibold">₱{(item.unit_price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout Section */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-800">
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-white">₱{getSubtotal().toFixed(2)}</span>
                  </div>
                  {getDiscountAmount() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Discount ({discountType === 'percentage' ? `${discountValue}%` : `₱${discountValue}`}):</span>
                      <span className="text-red-400">-₱{getDiscountAmount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax (8.75%):</span>
                    <span className="text-white">₱{(getTotal() * 0.0875).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-700 pt-3">
                    <span>Total:</span>
                    <span>₱{(getTotal() * 1.0875).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discount
                  </label>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">₱</option>
                    </select>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (discountType === 'percentage' && value <= 100) {
                          setDiscountValue(value);
                        } else if (discountType === 'fixed' && value <= getSubtotal()) {
                          setDiscountValue(value);
                        }
                      }}
                      placeholder={discountType === 'percentage' ? '0-100' : '0'}
                      min="0"
                      max={discountType === 'percentage' ? 100 : getSubtotal()}
                      step={discountType === 'percentage' ? 1 : 0.01}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {customerName && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Customer Type
                      </label>
                      <select
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value as 'retail' | 'wholesale' | 'regular')}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="regular">Regular Customer</option>
                        <option value="retail">Retailer</option>
                        <option value="wholesale">Wholesaler</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter phone number..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Enter email address..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                  </select>
                </div>

                <button
                  onClick={processPayment}
                  disabled={loading}
                  className="w-full bg-green-600 p-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                >
                  <CreditCard className="w-5 h-5" />
                  {loading ? 'Processing...' : `Pay ₱${(getTotal() * 1.0875).toFixed(2)}`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Cart Section */}
        <div className="lg:hidden bg-gray-900 border-t border-gray-800 p-4 fixed bottom-0 left-0 right-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Cart ({cart.length})</h2>
            </div>
            {cart.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-400">Total:</p>
                <p className="text-lg font-bold">₱{(getTotal() * 1.0875).toFixed(2)}</p>
              </div>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Cart is empty</p>
            </div>
          ) : (
            <>
              <div className="max-h-32 overflow-y-auto mb-4">
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-800 p-2 rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{item.name}</h3>
                        <p className="text-xs text-gray-400">{item.quantity} x ₱{item.unit_price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 bg-gray-700 rounded hover:bg-gray-600 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.current_stock}
                          className="w-6 h-6 bg-gray-700 rounded hover:bg-gray-600 flex items-center justify-center disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
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
                onClick={() => {
                  if (cart.length === 0) return;
                  // Show customer details modal on mobile
                  const name = prompt('Customer Name (Optional):');
                  if (name !== null) {
                    setCustomerName(name);
                    if (name.trim()) {
                      const type = prompt('Customer Type:\n1. Regular\n2. Retail\n3. Wholesale\n\nEnter 1, 2, or 3:');
                      if (type === '2') setCustomerType('retail');
                      else if (type === '3') setCustomerType('wholesale');
                      else setCustomerType('regular');
                      
                      const phone = prompt('Phone Number (Optional):');
                      if (phone) setCustomerPhone(phone);
                      
                      const email = prompt('Email Address (Optional):');
                      if (email) setCustomerEmail(email);
                    }
                  }
                  processPayment();
                }}
                disabled={loading || cart.length === 0}
                className="w-full bg-green-600 p-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <CreditCard className="w-5 h-5" />
                {loading ? 'Processing...' : `Pay ₱${(getTotal() * 1.0875).toFixed(2)}`}
              </button>
            </>
          )}
        </div>
      </div>

      <BarcodeScanner
        isOpen={scannerOpen}
        onScan={handleBarcodeScan}
        onClose={() => setScannerOpen(false)}
      />

      {/* Transaction History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96 p-4">
              {recentSales.length > 0 ? (
                <div className="space-y-3">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium">{sale.product_name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-semibold">₱{sale.total_amount.toLocaleString()}</span>
                          {sale.has_return ? (
                            <span className="px-3 py-1 bg-gray-600 text-gray-300 rounded text-xs">
                              Returned
                            </span>
                          ) : (
                            <button
                              onClick={() => processReturn(sale)}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Return
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <span className="block">Quantity: {sale.quantity}</span>
                          <span className="block">Unit Price: ₱{sale.unit_price}</span>
                        </div>
                        <div>
                          <span className="block">Payment: {sale.payment_method}</span>
                          <span className="block">Date: {new Date(sale.sale_date).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No transactions yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Virtual Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white text-black rounded-xl w-full max-w-md h-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Receipt Header */}
              <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
                <h2 className="text-lg sm:text-xl font-bold">SMART INVENTORY</h2>
                <p className="text-xs sm:text-sm text-gray-600">Motorcycle Parts & Accessories</p>
                <p className="text-xs text-gray-500 mt-1">Receipt No: {receiptData.receiptNo}</p>
                <p className="text-xs text-gray-500">{receiptData.date}</p>
              </div>

              {/* Customer Info */}
              <div className="mb-3 text-xs sm:text-sm">
                <p><strong>Customer:</strong> {receiptData.customerName}</p>
                {receiptData.customerPhone && (
                  <p><strong>Phone:</strong> {receiptData.customerPhone}</p>
                )}
                <p><strong>Type:</strong> {receiptData.customerType}</p>
              </div>

              {/* Items */}
              <div className="border-b border-dashed border-gray-300 pb-3 mb-3">
                <div className="text-xs sm:text-sm font-semibold mb-2">ITEMS:</div>
                {receiptData.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-xs sm:text-sm mb-1">
                    <div className="flex-1 pr-2">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-gray-600">{item.quantity} x ₱{item.unit_price.toFixed(2)}</div>
                    </div>
                    <div className="font-medium flex-shrink-0">
                      ₱{(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs sm:text-sm mb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₱{receiptData.subtotal.toFixed(2)}</span>
                </div>
                {receiptData.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount ({receiptData.discountType === 'percentage' ? `${receiptData.discountValue}%` : `₱${receiptData.discountValue}`}):</span>
                    <span>-₱{receiptData.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (8.75%):</span>
                  <span>₱{receiptData.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base sm:text-lg border-t border-gray-300 pt-2">
                  <span>TOTAL:</span>
                  <span>₱{receiptData.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="text-xs sm:text-sm mb-3">
                <p><strong>Payment Method:</strong> {receiptData.paymentMethod.toUpperCase()}</p>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 border-t border-dashed border-gray-300 pt-3">
                <p>Thank you for your business!</p>
                <p>Please keep this receipt for your records</p>
                {!isOnline && (
                  <p className="text-orange-600 mt-2">* Transaction will sync when online</p>
                )}
              </div>
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="flex-shrink-0 p-4 sm:p-6 pt-3 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                >
                  Print Receipt
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 bg-gray-600 text-white py-2.5 px-4 rounded-lg hover:bg-gray-700 transition-all text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}