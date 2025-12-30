import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Mail, Phone, Trash2, Search } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  customer_type: string;
  total_purchases: number;
  lifetime_value: number;
  created_at: string;
}

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadCustomers();
    
    const subscription = supabase
      .channel('customers_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          loadCustomers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredCustomers(
        customers.filter(customer => 
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.customer_type.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (customersData) {
      const { data: salesData } = await supabase
        .from('sales')
        .select('customer_id')
        .eq('status', 'completed')
        .not('customer_id', 'is', null);

      const customerStats = salesData?.reduce((acc, sale) => {
        if (sale.customer_id && !acc[sale.customer_id]) {
          acc[sale.customer_id] = { count: 0 };
        }
        if (sale.customer_id) {
          acc[sale.customer_id].count += 1;
        }
        return acc;
      }, {} as Record<string, { count: number }>) || {};

      const enrichedCustomers = customersData.map(customer => ({
        ...customer,
        lifetime_value: customer.total_purchases || 0,
        total_purchases: customerStats[customer.id]?.count || 0
      }));

      setCustomers(enrichedCustomers.sort((a, b) => b.lifetime_value - a.lifetime_value));
    }
  };

  const deleteCustomer = async (customerId: string, customerName: string) => {
    if (confirm(`Delete customer "${customerName}"? This action cannot be undone.`)) {
      setLoading(true);
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) {
        alert('Failed to delete customer');
      } else {
        loadCustomers();
      }
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Customers</h1>
          <p className="text-gray-400">Manage your customer relationships</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600/10 p-2 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold">Total Customers</h3>
          </div>
          <p className="text-3xl font-bold text-white mt-4">{customers.length}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-600/10 p-2 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white font-semibold">Total Revenue</h3>
          </div>
          <p className="text-3xl font-bold text-white mt-4">
            ₱{customers.reduce((sum, c) => sum + c.lifetime_value, 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-orange-600/10 p-2 rounded-lg">
              <Users className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-white font-semibold">Customer Types</h3>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Regular:</span>
              <span className="text-white">{customers.filter(c => c.customer_type === 'regular').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Retail:</span>
              <span className="text-white">{customers.filter(c => c.customer_type === 'retail').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Wholesale:</span>
              <span className="text-white">{customers.filter(c => c.customer_type === 'wholesale').length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Customer</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Total Purchases</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Lifetime Value</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Created</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-white font-medium">{customer.name}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Mail className="w-4 h-4" />
                      {customer.email || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Phone className="w-4 h-4" />
                      {customer.phone || 'N/A'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                    customer.customer_type === 'wholesale' ? 'bg-purple-600/10 text-purple-400' :
                    customer.customer_type === 'retail' ? 'bg-blue-600/10 text-blue-400' :
                    'bg-green-600/10 text-green-400'
                  }`}>
                    {customer.customer_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white font-medium">
                    {customer.total_purchases || 0}
                  </span>
                  <p className="text-gray-400 text-xs">transactions</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-green-400 font-semibold">
                    ₱{(customer.lifetime_value || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-400 text-sm">
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => deleteCustomer(customer.id, customer.name)}
                    disabled={loading}
                    className="text-red-400 hover:text-red-300 p-2 hover:bg-red-600/10 rounded-lg transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}