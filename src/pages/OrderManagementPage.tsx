import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      fetchCustomers();
      fetchProducts();
    }
    // eslint-disable-next-line
  }, [isModalOpen]);

  const fetchOrders = async () => {
    try {
      const data = await apiRequest('/api/orders');
      console.log('Fetched orders:', data);
      if (Array.isArray(data)) {
        const mappedOrders = data.map((order: any) => ({
          ...order,
          id: order._id || order.id,
          // Ensure customerName is set, falling back to customer.name or empty string
          customerName: order.customerName || (order.customer && order.customer.name) || '',
          // Ensure customerId is set, falling back to customer._id or customer.id
          customerId: order.customerId || (order.customer && (order.customer._id || order.customer.id)) || ''
        }));
        console.log('Mapped orders:', mappedOrders);
        setOrders(mappedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
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

  const handleEdit = async (order: Order) => {
    console.log('Editing order:', order);
    setEditingOrder(order);
    
    // Ensure we have the latest customers data
    await fetchCustomers();
    
    // Update form data with order details
    const formDataUpdate: OrderFormData = {
      customerId: order.customerId,
      items: order.items.map(item => ({
        productId: typeof item.productId === 'object' && item.productId !== null && '_id' in item.productId
          ? item.productId._id
          : item.productId,
        quantity: item.quantity,
        price: item.price,
        productName: typeof item.productId === 'object' && item.productId !== null && 'name' in item.productId
          ? item.productId.name
          : getProductName(item.productId as string)
      })),
      expectedDeliveryDate: order.expectedDeliveryDate
        ? order.expectedDeliveryDate.substring(0, 10)
        : '',
    };
    
    console.log('Setting form data:', formDataUpdate);
    setFormData(formDataUpdate);
    
    // If customer is not in the customers list, add it
    const customerExists = customers.some(c => c.id === order.customerId);
    console.log('Customer exists in list:', customerExists, 'Customer ID:', order.customerId);
    
    if (order.customerId && !customerExists) {
      console.log('Adding customer to list:', { id: order.customerId, name: order.customerName });
      setCustomers(prev => [
        ...prev, 
        { 
          id: order.customerId, 
          name: order.customerName || `Customer ${order.customerId.slice(-4)}` 
        }
      ]);
    }
    
    // Force a re-render of the dropdown by toggling the modal
    setIsModalOpen(false);
    setTimeout(() => {
      setIsModalOpen(true);
    }, 50);
  };

  const handleViewOrder = (order: Order) => setViewOrder(order);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await apiRequest(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      toast.success('Order status updated');
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

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
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => {
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
                      ) : (
                        <span>--</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-1">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => (
                          <div key={typeof item.productId === 'object' && item.productId !== null ? String(item.productId._id) : String(item.productId) || String(idx)}>
                            {item.quantity}
                          </div>
                        ))
                      ) : (
                        <span>--</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.createdAt && dayjs(order.createdAt).isValid() ? dayjs(order.createdAt).format('YYYY-MM-DD') : '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {editingOrder ? 'Edit Order' : 'Create Order'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                {editingOrder ? (
                  <div className="mt-1 p-2 bg-gray-100 rounded-md">
                    <p className="text-gray-900">
                      {editingOrder.customerName || `Customer ${editingOrder.customerId?.slice(-4) || ''}`}
                    </p>
                    <input type="hidden" name="customerId" value={editingOrder.customerId} />
                  </div>
                ) : (
                  <select
                    id="customer-select"
                    value={formData.customerId || ''}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="input-field mt-1"
                    required
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Items</label>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={item.productId ? item.productId + '-' + index : index} className="flex gap-2">
                      <label htmlFor={`product-select-${index}`} className="sr-only">Product</label>
                      <select
                        id={`product-select-${index}`}
                        value={typeof item.productId === 'object' && item.productId !== null ? item.productId._id : item.productId}
                        onChange={(e) => {
                          const selectedProduct = products.find(p => p.id === e.target.value);
                          const newItems = [...formData.items];
                          newItems[index] = {
                            ...newItems[index],
                            productId: e.target.value,
                            productName: selectedProduct ? selectedProduct.name : '',
                            price: selectedProduct ? selectedProduct.price : 0,
                          };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="input-field flex-1"
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                      <label htmlFor={`quantity-input-${index}`} className="sr-only">Quantity</label>
                      <input
                        id={`quantity-input-${index}`}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index] = {
                            ...newItems[index],
                            quantity: parseInt(e.target.value),
                          };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="input-field w-24"
                        min="1"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = formData.items.filter((_, i) => i !== index);
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: [...formData.items, { productId: '', productName: '', quantity: 1, price: 0 }],
                      });
                    }}
                    className="text-primary-600 hover:text-primary-900 text-sm"
                  >
                    + Add Item
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expected Delivery Date</label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate ? formData.expectedDeliveryDate.substring(0, 10) : ''}
                  onChange={e => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                  className="input-field mt-1"
                  required
                />
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
                  {editingOrder ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 animate-fade-in">
            <button
              onClick={() => setViewOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-primary-700 mb-6 text-center tracking-tight">Order Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-gray-600">
                <span className="font-semibold">Order ID:</span>
                <span className="font-mono">#{String(viewOrder.id).slice(-6)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="font-semibold">Customer:</span>
                <span>{viewOrder.customerName}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Items:</span>
                <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50">
                  {viewOrder.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center px-4 py-2">
                      <span className="font-medium text-gray-800">{typeof item.productId === 'object' && item.productId !== null ? item.productId.name : item.productName || '--'}</span>
                      <span className="text-xs text-gray-500">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-primary-700">${viewOrder.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="font-semibold">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{viewOrder.status}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="font-semibold">Date:</span>
                <span>{viewOrder.createdAt ? viewOrder.createdAt.substring(0, 10) : '--'}</span>
              </div>
              {viewOrder.expectedDeliveryDate && (
                <div className="flex justify-between text-gray-600">
                  <span className="font-semibold">Expected Delivery:</span>
                  <span>{viewOrder.expectedDeliveryDate.substring(0, 10)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => { setViewOrder(null); handleEdit(viewOrder); }}
                className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 font-semibold hover:bg-primary-100 transition"
              >
                Edit
              </button>
              <button
                onClick={async () => { await handleDelete(viewOrder.id); setViewOrder(null); }}
                className="px-4 py-2 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
