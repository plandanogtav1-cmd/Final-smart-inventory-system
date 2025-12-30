import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package } from 'lucide-react';

interface ProductSales {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export default function TopProductsChart() {
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);

  useEffect(() => {
    loadTopProducts();
  }, []);

  const loadTopProducts = async () => {
    const { data: salesData } = await supabase
      .from('sales')
      .select('product_id, quantity, total_amount')
      .eq('status', 'completed');

    if (salesData) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name');

      if (productsData) {
        const productMap = productsData.reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);

        const aggregated = salesData.reduce((acc, sale) => {
          const name = productMap[sale.product_id] || 'Unknown';
          if (!acc[name]) {
            acc[name] = { total_quantity: 0, total_revenue: 0 };
          }
          acc[name].total_quantity += sale.quantity;
          acc[name].total_revenue += sale.total_amount;
          return acc;
        }, {} as Record<string, { total_quantity: number; total_revenue: number }>);

        const sorted = Object.entries(aggregated)
          .map(([name, data]) => ({
            product_name: name,
            total_quantity: data.total_quantity,
            total_revenue: data.total_revenue
          }))
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 8);

        setTopProducts(sorted);
      }
    }
  };

  const maxRevenue = Math.max(...topProducts.map(p => p.total_revenue), 1);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white text-lg font-semibold">Top Products</h3>
          <p className="text-gray-400 text-sm mt-1">Best sellers by revenue</p>
        </div>
        <div className="bg-blue-600/10 p-2 rounded-lg">
          <Package className="w-5 h-5 text-blue-400" />
        </div>
      </div>

      <div className="space-y-4">
        {topProducts.length > 0 ? (
          topProducts.map((product, index) => {
            const percentage = (product.total_revenue / maxRevenue) * 100;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 truncate">{product.product_name}</span>
                  <span className="text-white font-medium ml-2">₱{product.total_revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{product.total_quantity} sold</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-center py-8">No sales data available</p>
        )}
      </div>
    </div>
  );
}
