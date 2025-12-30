import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingCart } from 'lucide-react';

interface Sale {
  id: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  created_at: string;
}

export default function RecentSalesWidget() {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    loadRecentSales();
  }, []);

  const loadRecentSales = async () => {
    const { data: salesData } = await supabase
      .from('sales')
      .select('id, product_id, quantity, total_amount, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (salesData) {
      const productIds = salesData.map(s => s.product_id);
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
          product_name: productMap[sale.product_id] || 'Unknown',
          quantity: sale.quantity,
          total_amount: sale.total_amount,
          created_at: sale.created_at
        }));

        setSales(enrichedSales);
      }
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white text-lg font-semibold">Recent Sales</h3>
          <p className="text-gray-400 text-sm mt-1">Latest transactions</p>
        </div>
        <div className="bg-purple-600/10 p-2 rounded-lg">
          <ShoppingCart className="w-5 h-5 text-purple-400" />
        </div>
      </div>

      <div className="space-y-3">
        {sales.length > 0 ? (
          sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-all">
              <div className="flex-1">
                <p className="text-gray-300 text-sm font-medium">{sale.product_name}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Qty: {sale.quantity} • {new Date(sale.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-semibold">₱{sale.total_amount.toLocaleString()}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">No recent sales</p>
        )}
      </div>
    </div>
  );
}
