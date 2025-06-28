import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import {
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { logAction } from '../utils/log';

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  expectedDeliveryDate?: string;
}

interface OrderItem {
  productId: string | { _id: string; name: string };
  productName?: string;
  quantity: number;
  price: number;
}

interface OrderFormData {
  customerId: string;
  items: OrderItem[];
  expectedDeliveryDate?: string;
  assignedTo?: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
}

interface UserOption {
  _id: string;
  name?: string;
  email: string;
}

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<OrderFormData>({
    customerId: '',
    items: [],
  });
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Fetch users when the "Assigned To" dropdown is focused
  const handleUserDropdownFocus = async () => {
    if (users.length === 0) {
      try {
        const data = await apiRequest('/api/users');
        if (Array.isArray(data)) {
          setUsers(data.map((u: any) => ({
            _id: u._id || u.id,
            name: u.name,
            email: u.email,
          })));
        }
      } catch (error) {
        toast.error('Failed to fetch users');
      }
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await apiRequest('/api/orders');
      if (Array.isArray(data)) {
        const mappedOrders = data.map((order: any) => ({ ...order, id: order._id }));
        setOrders(mappedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await apiRequest('/api/customers');
      if (Array.isArray(data)) {
        setCustomers(data.map((c: any) => ({ id: c._id || c.id, name: c.name })));
      } else {
        setCustomers([]);
      }
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiRequest('/api/products');
      if (Array.isArray(data)) {
        setProducts(data.map((p: any) => ({ id: p._id || p.id, name: p.name, price: p.price })));
      } else {
        setProducts([]);
      }
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.items.length === 0 || formData.items.some(item => !item.productId || !item.quantity)) {
      toast.error('Please fill in all required fields and add at least one item.');
      return;
    }

    // Get customer name
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    if (!selectedCustomer) {
      toast.error('Selected customer not found');
      return;
    }

    // Calculate total
    const total = formData.items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    const orderData = {
      customerId: formData.customerId,
      customerName: selectedCustomer.name,
      items: formData.items.map(item => ({
        productId: item.productId,
        quantity: parseInt(String(item.quantity)),
        price: products.find(p => p.id === item.productId)?.price || 0
      })),
      total: parseFloat(total.toFixed(2)),
      status: 'pending',
      expectedDeliveryDate: formData.expectedDeliveryDate
    };

    try {
      let response: any;
      if (editingOrder) {
        response = await apiRequest(`/api/orders/${editingOrder.id}`, {
          method: 'PATCH',
          body: JSON.stringify(orderData),
        });
        toast.success('Order updated successfully');
        logAction({
          action: 'update',
          entity: 'order',
          entityId: editingOrder.id,
          user: JSON.parse(localStorage.getItem('user') || '{}'),
          details: { customerName: orderData.customerName }
        });
      } else {
        response = await apiRequest('/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData),
        });
        toast.success('Order created successfully');
        logAction({
          action: 'create',
          entity: 'order',
          entityId: response?.id,
          user: JSON.parse(localStorage.getItem('user') || '{}'),
          details: { customerName: orderData.customerName }
        });
      }
      setIsModalOpen(false);
      setEditingOrder(null);
      setFormData({
        customerId: '',
        items: [],
      });
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save order');
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await apiRequest(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customerId: order.customerId,
      items: order.items.map(item => ({
        productId: typeof item.productId === 'object' && item.productId !== null && '_id' in item.productId
          ? item.productId._id
          : item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      expectedDeliveryDate: order.expectedDeliveryDate
        ? order.expectedDeliveryDate.substring(0, 10)
        : '',
    });
    setIsModalOpen(true);
  };

  const handleViewOrder = (order: Order) => setViewOrder(order);


  const filteredOrders = orders.filter(order =>
    (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (order.id && String(order.id).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper to get customer name by ID
  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : '--';
  };
  // Helper to get product name by ID
  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : '--';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
        <button
          onClick={() => {
            setEditingOrder(null);
            setFormData({
              customerId: '',
              items: [],
            });
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Order
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{String(order.id).slice(-6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.customerName || getCustomerName(order.customerId)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-1">
                      {order.items && order.items.length > 0
                        ? order.items.map((item, idx) => {
                            // Handle both populated and unpopulated productId
                            let productName = '--';
                            if (item && item.productId) {
                              if (typeof item.productId === 'object' && item.productId !== null && 'name' in item.productId) {
                                productName = item.productId.name;
                              } else if (item.productName) {
                                productName = item.productName;
                              } else {
                                productName = getProductName(item.productId);
                              }
                            }
                            return (
                              <div key={typeof item.productId === 'object' && item.productId !== null ? String(item.productId._id) : String(item.productId) || String(idx)} className="flex items-center">
                                <span>{productName}</span>
                              </div>
                            );
                          })
                        : <span>--</span>
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-1">
                      {order.items && order.items.length > 0
                        ? order.items.map((item, idx) => (
                            <div key={typeof item.productId === 'object' && item.productId !== null ? String(item.productId._id) : String(item.productId) || String(idx)}>
                              {item.quantity}
                            </div>
                          ))
                        : <span>--</span>
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    {order.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await apiRequest(`/api/orders/${order.id}/approve`, { method: 'PATCH' });
                              setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'completed' } : o));
                              toast.success('Order approved');
                            } catch (error) {
                              toast.error('Failed to approve order');
                            }
                          }}
                          className="inline-flex items-center justify-center px-3 py-1 rounded bg-green-500 text-white text-xs font-semibold shadow hover:bg-green-600 transition"
                          style={{ minWidth: 90 }}
                        >
                          <span className="material-icons mr-1" style={{ fontSize: 16 }}></span> Approve
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await apiRequest(`/api/orders/${order.id}/cancel`, { method: 'PATCH' });
                              setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
                              toast.success('Order cancelled');
                            } catch (error) {
                              toast.error('Failed to cancel order');
                            }
                          }}
                          className="inline-flex items-center justify-center px-3 py-1 rounded bg-red-500 text-white text-xs font-semibold shadow hover:bg-red-600 transition"
                          style={{ minWidth: 90 }}
                        >
                          <span className="material-icons mr-1" style={{ fontSize: 16 }}></span> Cancel
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.createdAt ? dayjs(order.createdAt).format('YYYY-MM-DD') : '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="btn-secondary btn-xs"
                      onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }}
                      tabIndex={0}
                    >
                      View
                    </button>
                    <button
                      className="btn-primary btn-xs ml-2"
                      onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                      tabIndex={0}
                      style={{ zIndex: 10, position: 'relative' }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger btn-xs ml-2"
                      onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}
                      tabIndex={0}
                      style={{ zIndex: 10, position: 'relative' }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create/Edit Order */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingOrder ? 'Edit Order' : 'Create Order'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <select
                  value={formData.customerId}
                  onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                  className="input-field mt-1"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Items</label>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select
                      value={typeof item.productId === 'object' && item.productId !== null ? item.productId._id : item.productId}
                      onChange={e => {
                        const newItems = [...formData.items];
                        newItems[idx].productId = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="input-field"
                      required
                    >
                      <option value="">Select product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => {
                        const newItems = [...formData.items];
                        newItems[idx].quantity = parseInt(e.target.value) || 1;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="input-field"
                      placeholder="Qty"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = formData.items.filter((_, i) => i !== idx);
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="ml-2 px-2 py-1 text-xs text-red-600 border border-red-300 rounded"
                      disabled={formData.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, items: [...formData.items, { productId: '', quantity: 1, price: 0 }] })}
                  className="mt-2 px-3 py-1 text-xs text-blue-600 border border-blue-300 rounded"
                >
                  Add Item
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expected Delivery Date</label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate || ''}
                  onChange={e => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                  className="input-field mt-1"
                />
              </div>
              {/* Assigned To Dropdown */}
              <div>
                <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">Assigned To</label>
                <select
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  onFocus={handleUserDropdownFocus}
                  className="input-field mt-1"
                >
                  <option value="">Select user</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.name || user.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for View Order Details */}
      {viewOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
            <div className="mb-4">
              <strong>Order ID:</strong> #{String(viewOrder.id).slice(-6)}<br />
              <strong>Customer:</strong> {viewOrder.customerName || getCustomerName(viewOrder.customerId)}<br />
              <strong>Status:</strong> <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewOrder.status)}`}>{viewOrder.status.charAt(0).toUpperCase() + viewOrder.status.slice(1)}</span><br />
              <strong>Date:</strong> {viewOrder.createdAt ? dayjs(viewOrder.createdAt).format('YYYY-MM-DD') : '--'}<br />
              <strong>Expected Delivery:</strong> {viewOrder.expectedDeliveryDate || '--'}
            </div>
            <div className="mb-4">
              <strong>Items:</strong>
              <ul className="list-disc ml-6">
                {viewOrder.items.map((item, idx) => (
                  <li key={idx}>
                    {typeof item.productId === 'object' && item.productId !== null && 'name' in item.productId
                      ? item.productId.name
                      : item.productName || getProductName(item.productId as string)}
                    {' '}x {item.quantity} @ ${item.price.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-4">
              <strong>Total:</strong> ${typeof viewOrder.total === 'number' ? viewOrder.total.toFixed(2) : '0.00'}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500 border border-gray-300 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
