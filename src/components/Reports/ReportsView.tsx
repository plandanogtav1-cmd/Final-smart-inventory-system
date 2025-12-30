import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Download, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ReportsView() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('inventory');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const exportReport = () => {
    if (!report) return;

    let csvContent = '';
    let filename = '';

    if (report.type === 'inventory') {
      filename = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'Product Name,SKU,Category,Current Stock,Unit Price,Cost Price,Total Value,Profit Margin,Status,Supplier\n';
      
      report.data.products.forEach((product: any) => {
        const totalValue = product.current_stock * product.unit_price;
        const totalCost = product.current_stock * (product.cost_price || 0);
        const profitMargin = product.unit_price > 0 ? (((product.unit_price - (product.cost_price || 0)) / product.unit_price) * 100).toFixed(1) : '0';
        const status = product.current_stock === 0 ? 'Out of Stock' : 
                      product.current_stock <= (product.min_stock_threshold || 0) ? 'Low Stock' : 'In Stock';
        
        // Clean data for CSV - escape quotes and handle null values
        const cleanName = (product.name || 'N/A').replace(/"/g, '""');
        const cleanSku = (product.sku || 'N/A').replace(/"/g, '""');
        const cleanCategory = (product.category || 'N/A').replace(/"/g, '""');
        const cleanSupplier = (product.supplier_name || 'N/A').replace(/"/g, '""');
        
        csvContent += `"${cleanName}","${cleanSku}","${cleanCategory}",${product.current_stock || 0},${product.unit_price || 0},${product.cost_price || 0},${totalValue},"${profitMargin}%","${status}","${cleanSupplier}"\n`;
      });
    } else if (report.type === 'sales') {
      filename = `sales_report_${dateFrom || 'all'}_to_${dateTo || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'Date,Time,Product Name,SKU,Category,Quantity,Unit Price,Total Amount,Payment Method,Customer,Status\n';
      
      report.data.sales.forEach((sale: any) => {
        const saleDate = new Date(sale.created_at || sale.sale_date);
        const dateStr = saleDate.toLocaleDateString();
        const timeStr = saleDate.toLocaleTimeString();
        
        // Clean data for CSV
        const cleanProduct = (sale.product_name || 'N/A').replace(/"/g, '""');
        const cleanSku = (sale.product_sku || 'N/A').replace(/"/g, '""');
        const cleanCategory = (sale.product_category || 'N/A').replace(/"/g, '""');
        const cleanPayment = (sale.payment_method || 'N/A').replace(/"/g, '""');
        const cleanCustomer = (sale.customer_name || 'N/A').replace(/"/g, '""');
        const cleanStatus = (sale.status || 'completed').replace(/"/g, '""');
        
        csvContent += `"${dateStr}","${timeStr}","${cleanProduct}","${cleanSku}","${cleanCategory}",${sale.quantity || 0},${sale.unit_price || 0},${sale.total_amount || 0},"${cleanPayment}","${cleanCustomer}","${cleanStatus}"\n`;
      });
    } else if (report.type === 'supplier') {
      filename = `supplier_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'Supplier Name,Contact Person,Email,Phone,Address,Rating,Lead Time (Days),Products Count,Total Orders,Last Order Date,Status\n';
      
      report.data.suppliers.forEach((supplier: any) => {
        // Clean data for CSV
        const cleanName = (supplier.name || 'N/A').replace(/"/g, '""');
        const cleanContact = (supplier.contact_person || 'N/A').replace(/"/g, '""');
        const cleanEmail = (supplier.email || 'N/A').replace(/"/g, '""');
        const cleanPhone = (supplier.phone || 'N/A').replace(/"/g, '""');
        const cleanAddress = (supplier.address || 'N/A').replace(/"/g, '""');
        const lastOrderDate = supplier.last_order_date ? new Date(supplier.last_order_date).toLocaleDateString() : 'N/A';
        
        csvContent += `"${cleanName}","${cleanContact}","${cleanEmail}","${cleanPhone}","${cleanAddress}",${supplier.rating || 0},${supplier.lead_time_days || 0},${supplier.products_count || 0},${supplier.total_orders || 0},"${lastOrderDate}","${supplier.is_active ? 'Active' : 'Inactive'}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let reportData: any = {};
      let summary = '';

      if (reportType === 'inventory') {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);

        const totalValue = (products || []).reduce((sum, p) => sum + (p.current_stock * p.unit_price), 0);
        const lowStock = (products || []).filter(p => p.current_stock <= p.min_stock_threshold);
        const outOfStock = (products || []).filter(p => p.current_stock === 0);

        reportData = {
          total_products: products?.length || 0,
          total_value: totalValue,
          low_stock_count: lowStock.length,
          out_of_stock_count: outOfStock.length,
          products: products || []
        };

        summary = `Inventory Report: ${products?.length || 0} total products with ₱${totalValue.toLocaleString()} total value. ${lowStock.length} products are low on stock, ${outOfStock.length} are out of stock.`;
      } else if (reportType === 'sales') {
        const query = supabase
          .from('sales')
          .select(`
            *,
            products!inner(name, sku, category),
            customers(name)
          `)
          .eq('status', 'completed');

        if (dateFrom) query.gte('created_at', dateFrom);
        if (dateTo) query.lte('created_at', dateTo);

        const { data: sales } = await query;

        // Enrich sales data with product and customer info
        const enrichedSales = (sales || []).map(sale => ({
          ...sale,
          product_name: sale.products?.name || 'Unknown Product',
          product_sku: sale.products?.sku || 'N/A',
          product_category: sale.products?.category || 'N/A',
          customer_name: sale.customers?.name || 'Walk-in Customer'
        }));

        const totalRevenue = enrichedSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const totalUnits = enrichedSales.reduce((sum, s) => sum + (s.quantity || 0), 0);

        reportData = {
          total_sales: enrichedSales.length,
          total_revenue: totalRevenue,
          total_units: totalUnits,
          avg_order_value: enrichedSales.length ? totalRevenue / enrichedSales.length : 0,
          date_range: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All time',
          sales: enrichedSales
        };

        const dateRangeText = dateFrom && dateTo ? ` from ${dateFrom} to ${dateTo}` : '';
        summary = `Sales Report${dateRangeText}: ${enrichedSales.length} transactions generating ₱${totalRevenue.toLocaleString()} in revenue. ${totalUnits} units sold with an average order value of ₱${(reportData.avg_order_value).toFixed(2)}.`;
      } else if (reportType === 'supplier') {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select(`
            *,
            products!supplier_id(count)
          `)
          .eq('is_active', true);

        // Enrich supplier data with additional metrics
        const enrichedSuppliers = await Promise.all((suppliers || []).map(async (supplier) => {
          // Get product count for this supplier
          const { count: productCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_id', supplier.id)
            .eq('is_active', true);

          // Get order history (if you have purchase orders table)
          // For now, we'll use a placeholder
          return {
            ...supplier,
            products_count: productCount || 0,
            total_orders: 0, // Placeholder - implement if you have purchase orders
            last_order_date: null // Placeholder
          };
        }));

        const avgRating = enrichedSuppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / (enrichedSuppliers.length || 1);

        reportData = {
          total_suppliers: enrichedSuppliers.length,
          avg_rating: avgRating,
          active_suppliers: enrichedSuppliers.filter(s => s.is_active).length,
          total_products_supplied: enrichedSuppliers.reduce((sum, s) => sum + (s.products_count || 0), 0),
          suppliers: enrichedSuppliers
        };

        summary = `Supplier Report: ${enrichedSuppliers.length} active suppliers with an average rating of ${avgRating.toFixed(2)}/5.00. Total of ${reportData.total_products_supplied} products supplied.`;
      }

      await supabase.from('reports').insert([{
        report_type: reportType,
        report_name: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        data: reportData,
        summary,
        created_by: user?.id
      }]);

      setReport({ type: reportType, data: reportData, summary, date: new Date().toISOString() });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Automated Reports</h1>
        <p className="text-gray-400">Generate comprehensive business reports</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white text-lg font-semibold mb-4">Generate New Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="inventory">Inventory Report</option>
              <option value="sales">Sales Report</option>
              <option value="supplier">Supplier Report</option>
            </select>
          </div>

          {reportType === 'sales' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {report && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-600/10 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-white text-lg font-semibold">
                  {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <p className="text-gray-400 text-sm">
                    Generated on {new Date(report.date).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <button 
              onClick={exportReport}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h4 className="text-gray-400 text-sm font-medium mb-2">Summary</h4>
            <p className="text-gray-200">{report.summary}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(report.data).map(([key, value]) => {
              if (Array.isArray(value)) return null;
              return (
                <div key={key} className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase mb-1">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-white text-xl font-semibold">
                    {typeof value === 'number' && key.includes('value')
                      ? `₱${value.toLocaleString()}`
                      : typeof value === 'number' && key.includes('revenue')
                      ? `₱${value.toLocaleString()}`
                      : typeof value === 'number'
                      ? value.toLocaleString()
                      : value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
