import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import { logAction } from '../utils/log';

type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'processing' | 'completed' | 'cancelled';
type DeliveryStatus = 'pending' | 'delivered';

interface OrderItemDetail {
  id: string;
  product: {
    _id: string;
    name: string;
  };
  quantity: number;
  price: number;
}

interface DeliveryOrder {
  id: string;
  doNumber: string;
  poNumber: string;
  items: OrderItemDetail[];
  totalAmount: number;
  customerName: string;
  deliveryDate: string;
  status: 'pending' | 'delivered';
  transportInfo: {
    transporter: string;
    vehicleNumber: string;
    driverName: string;
    contactNumber: string;
  };
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'accepted' | 'rejected' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  expectedDeliveryDate?: string;
  deliveryOrder?: DeliveryOrder;
}

interface OrderItem {
  productId: string | { _id: string; name: string };
  productName?: string;
  quantity: number;
  price: number;
}

interface OrderFormData {
  customerId: string;
  customerName?: string;
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
  // State for orders and UI
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  
  // Modal and form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<OrderFormData>({
    customerId: '',
    items: [],
  });
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // API data states
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  
  // Wrapper functions for state setters to ensure consistent usage
  const setExpandedOrderIdWrapper = React.useCallback((id: string | null) => setExpandedOrderId(id), []);
  const setCustomersWrapper = React.useCallback((newCustomers: CustomerOption[]) => setCustomers(newCustomers), []);
  const setProductsWrapper = React.useCallback((newProducts: ProductOption[]) => setProducts(newProducts), []);
  
  // Refs for stable access to state values in callbacks
  const expandedOrderIdRef = React.useRef(expandedOrderId);
  const customersRef = React.useRef(customers);
  const productsRef = React.useRef(products);
  
  // Update refs when state changes
  React.useEffect(() => {
    expandedOrderIdRef.current = expandedOrderId;
  }, [expandedOrderId]);
  
  React.useEffect(() => {
    customersRef.current = customers;
  }, [customers]);
  
  React.useEffect(() => {
    productsRef.current = products;
  }, [products]);
  
  // Memoized filtered orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase();
    return orders.filter(order => 
      (order.id && order.id.toLowerCase().includes(query)) ||
      (order.customerName && order.customerName.toLowerCase().includes(query)) ||
      (order.status && order.status.toLowerCase().includes(query)) ||
      (order.expectedDeliveryDate && order.expectedDeliveryDate.includes(query))
    );
  }, [orders, searchQuery]);

  // Helper function to safely update order status
  const updateOrderStatus = (orderId: string, updates: Partial<Order>) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId ? { ...order, ...updates } : order
      )
    );
  };
  
  // Get status color for UI
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ordersData, customersData, productsData] = await Promise.all([
          apiRequest<Order[]>('/api/orders'),
          apiRequest<CustomerOption[]>('/api/customers'),
          apiRequest<{products: any[]}>('/api/products')
        ]);
        
        setOrders(ordersData);
        setCustomersWrapper(customersData);
        setProductsWrapper(productsData.products.map((p: any) => ({
          id: p._id || p.id || '',
          name: p.name,
          price: p.price
        })));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      setProcessingOrderId(orderId);
      await apiRequest(`/api/orders/${orderId}/accept`, { method: 'POST' });
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: 'accepted' } : order
        )
      );
      
      toast.success('Order accepted successfully');
      await logAction({
        action: 'order_accepted',
        entity: 'order',
        entityId: orderId,
        details: { status: 'accepted' }
      });
    } catch (error: unknown) {
      console.error('Error accepting order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept order';
      toast.error(errorMessage);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to reject this order? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingOrderId(orderId);
      await apiRequest(`/api/orders/${orderId}`, { method: 'DELETE' });
      
      setOrders(prevOrders => 
        prevOrders.filter(order => order.id !== orderId)
      );
      
      toast.success('Order rejected successfully');
      await logAction({
        action: 'order_rejected',
        entity: 'order',
        entityId: orderId,
        details: { status: 'rejected' }
      });
    } catch (error: unknown) {
      console.error('Error rejecting order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject order';
      toast.error(errorMessage);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleSwitchToDO = async (orderId: string): Promise<void> => {
    try {
      setProcessingOrderId(orderId);
      const response = await apiRequest<{deliveryOrder: DeliveryOrder}>(
        `/api/orders/${orderId}/switch-to-do`,
        { method: 'POST' }
      );
      
      if (response?.deliveryOrder) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  status: 'processing' as const,
                  deliveryOrder: response.deliveryOrder 
                } 
              : order
          )
        );
        
        toast.success('Order converted to delivery order');
        setExpandedOrderIdWrapper(orderId);
        
        await logAction({
          action: 'order_converted_to_do',
          entity: 'order',
          entityId: orderId,
          details: { doNumber: response.deliveryOrder?.doNumber }
        });
      }
    } catch (error: unknown) {
      console.error('Error converting to delivery order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert to delivery order';
      toast.error(errorMessage);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleUpdateDeliveryStatus = async (deliveryOrderId: string, status: 'delivered' | 'pending') => {
    try {
      setDeliveryStatus(prev => ({ ...prev, [deliveryOrderId]: 'loading' as const }));
      
      const response = await apiRequest<{deliveryOrder: DeliveryOrder}>(
        `/api/orders/delivery/${deliveryOrderId}/status`,
        {
          method: 'POST',
          body: JSON.stringify({ status })
        }
      );

      if (response?.deliveryOrder) {
        setOrders(prevOrders => 
          prevOrders.map(order => {
            if (order.deliveryOrder?.id === deliveryOrderId) {
              return {
                ...order,
                status: status === 'delivered' ? 'completed' : order.status,
                deliveryOrder: {
                  ...order.deliveryOrder,
                  status
                }
              };
            }
            return order;
          })
        );
        
        toast.success(`Delivery order marked as ${status}`);
        
        await logAction({
          action: `delivery_${status}`,
          entity: 'delivery_order',
          entityId: deliveryOrderId,
          details: { status }
        });
      }
    } catch (error: unknown) {
      console.error('Error updating delivery status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update delivery status';
      toast.error(errorMessage);
    } finally {
      setDeliveryStatus(prev => ({
        ...prev,
        [deliveryOrderId]: 'idle' as const
      }));
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      setProcessingOrderId(orderId);
      await apiRequest(`/api/orders/${orderId}/reject`, { method: 'POST' });
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: 'rejected' } : order
        )
      );
      
      toast.success('Order rejected successfully');
      await logAction({
        action: 'order_rejected',
        entity: 'order',
        entityId: orderId,
        details: { status: 'rejected' }
      });
    } catch (error: unknown) {
      console.error('Error rejecting order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject order';
      toast.error(errorMessage);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleSwitchToDO = React.useCallback(async (orderId: string) => {
    try {
      setProcessingOrderId(orderId);
      const response = await apiRequest<{deliveryOrder: DeliveryOrder}>(
        `/api/orders/${orderId}/switch-to-do`,
        { method: 'POST' }
      );
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: 'processing' as const,
                deliveryOrder: response.deliveryOrder 
              } 
            : order
        )
      );
      
      toast.success('Order converted to delivery order');
      setExpandedOrderIdWrapper(orderId);
      
      await logAction({
        action: 'order_converted_to_do',
        entity: 'order',
        entityId: orderId,
        details: { doNumber: response.deliveryOrder?.doNumber }
      });
    } catch (error: unknown) {
      console.error('Error converting to delivery order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert to delivery order';
      toast.error(errorMessage);
    } finally {
      setProcessingOrderId(null);
    }
  }, [setExpandedOrderIdWrapper]);

  // Order action states - Keep only one set of state declarations
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchOrders(),
          fetchCustomers(),
          fetchProducts()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
        toast.error('Failed to initialize data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      // Refresh customers and products when modal opens
      fetchCustomers();
      fetchProducts();
    }
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
        const customerOptions: CustomerOption[] = data.map((c: { _id?: string; id?: string; name: string }) => ({
          id: c._id || c.id || '',
          name: c.name
        }));
        setCustomersWrapper(customerOptions);
      } else {
        setCustomersWrapper([]);
      }
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiRequest<{ products: { _id?: string; id?: string; name: string; price: number }[] }>('/api/products');
      if (Array.isArray(data.products)) {
        const productOptions: ProductOption[] = data.products.map((p) => ({
          id: p._id || p.id || '',
          name: p.name,
          price: p.price
        }));
        setProductsWrapper(productOptions);
      } else {
        setProductsWrapper([]);
      }
    } catch (error: unknown) {
      toast.error('Failed to fetch products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.items.length === 0 || formData.items.some(item => !item.productId || !item.quantity)) {
      toast.error('Please fill in all required fields and add at least one item.');
      return;
    }

    try {
      const selectedCustomer = customersRef.current.find((c: CustomerOption) => c.id === formData.customerId);
      if (!selectedCustomer) {
        toast.error('Selected customer not found');
        return;
      }

      const orderData = {
        customerId: formData.customerId,
        customerName: selectedCustomer.name,
        items: formData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: productsRef.current.find(p => p.id === item.productId)?.price || 0
        })),
        total: formData.items.reduce((sum: number, item: OrderItem) => {
          const product = productsRef.current.find((p: ProductOption) => p.id === item.productId);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0),
        status: 'pending' as const,
        expectedDeliveryDate: formData.expectedDeliveryDate
      };

      let response;
      if (editingOrder) {
        response = await apiRequest(`/api/orders/${editingOrder.id}`, {
          method: 'PATCH',
          body: JSON.stringify(orderData),
        });
        toast.success('Order updated successfully');
      } else {
        response = await apiRequest('/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData),
        });
        toast.success('Order created successfully');
      }

      setIsModalOpen(false);
      setEditingOrder(null);
      setFormData({
        customerId: '',
        items: [],
      });
      await fetchOrders();
      
      await logAction({
        action: editingOrder ? 'order_updated' : 'order_created',
        entity: 'order',
        entityId: editingOrder?.id || response?.id || 'unknown',
        user: JSON.parse(localStorage.getItem('user') || '{}'),
        details: { customerName: orderData.customerName }
      });
    } catch (error: unknown) {
      console.error('Error submitting order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit order';
      toast.error(errorMessage);
    }
  };

  const handleDelete = React.useCallback(async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await apiRequest(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      toast.success('Order deleted successfully');
      fetchOrders();
      
      await logAction({
        action: 'order_deleted',
        entity: 'order',
        entityId: orderId,
        details: {}
      });
    } catch (error: unknown) {
      console.error('Error deleting order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete order';
      toast.error(errorMessage);
    }
  }, [fetchOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
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
                <React.Fragment key={order.id}>
                  <tr 
                    className={`hover:bg-gray-50 cursor-pointer ${expandedOrderIdRef.current === order.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setExpandedOrderIdWrapper(expandedOrderIdRef.current === order.id ? null : order.id)}
                  >
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.expectedDeliveryDate && dayjs(order.expectedDeliveryDate).isValid() 
                        ? dayjs(order.expectedDeliveryDate).format('MMM D, YYYY') 
                        : '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {order.status === 'pending' ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptOrder(order.id);
                            }}
                            disabled={processingOrder === order.id}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {processingOrder === order.id ? 'Accepting...' : 'Accept'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectOrder(order.id);
                            }}
                            disabled={processingOrder === order.id}
                            className="text-red-600 hover:text-red-800 ml-2 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : order.status === 'accepted' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchToDO(order.id);
                          }}
                          disabled={processingOrder === order.id}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {processingOrder === order.id ? 'Processing...' : 'Switch to DO'}
                        </button>
                      ) : order.status === 'processing' && order.deliveryOrder ? (
                        <span className="text-purple-600">DO: {order.deliveryOrder.doNumber}</span>
                      ) : order.status === 'completed' ? (
                        <span className="text-green-600">Completed</span>
                      ) : order.status === 'rejected' ? (
                        <span className="text-red-600">Rejected</span>
                      ) : (
                        <span className="text-gray-600">No actions</span>
                      )}
                    </td>
                  </tr>
                  {expandedOrderIdRef.current === order.id && order.deliveryOrder && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-gray-50">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="font-medium text-gray-900 mb-2">Delivery Order: {order.deliveryOrder.doNumber}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">PO Number</p>
                              <p className="font-medium">{order.deliveryOrder.poNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Status</p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                order.deliveryOrder.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {order.deliveryOrder.status.charAt(0).toUpperCase() + order.deliveryOrder.status.slice(1)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Delivery Date</p>
                              <p className="font-medium">
                                {dayjs(order.deliveryOrder.deliveryDate).format('MMM D, YYYY')}
                              </p>
                            </div>
                          </div>
                          <div className="mb-4">
                            <h5 className="font-medium text-gray-900 mb-2">Items</h5>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {order.deliveryOrder.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                                        {typeof item.product === 'object' ? item.product.name : item.product}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm">${item.price.toFixed(2)}</td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm">${(item.quantity * item.price).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              {order.deliveryOrder.transportInfo && (
                                <>
                                  <p className="text-sm text-gray-500">Transport Info</p>
                                  <p className="text-sm">
                                    {order.deliveryOrder.transportInfo.transporter}
                                    {order.deliveryOrder.transportInfo.vehicleNumber && 
                                      ` (${order.deliveryOrder.transportInfo.vehicleNumber})`}
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateDeliveryStatus(order.deliveryOrder!.id, 'pending');
                                }}
                                disabled={deliveryStatus[order.deliveryOrder!.id] === 'loading'}
                                className={`px-3 py-1 rounded text-sm ${
                                  order.deliveryOrder.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800 cursor-default'
                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                }`}
                              >
                                {deliveryStatus[order.deliveryOrder.id] === 'loading' 
                                  ? 'Updating...' 
                                  : 'Mark as Pending'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateDeliveryStatus(order.deliveryOrder!.id, 'delivered');
                                }}
                                disabled={deliveryStatus[order.deliveryOrder!.id] === 'loading'}
                                className={`px-3 py-1 rounded text-sm ${
                                  order.deliveryOrder.status === 'delivered'
                                    ? 'bg-green-100 text-green-800 cursor-default'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                              >
                                {deliveryStatus[order.deliveryOrder.id] === 'loading' 
                                  ? 'Updating...' 
                                  : 'Mark as Delivered'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
                <label htmlFor="customer-select" className="block text-sm font-medium text-gray-700">Customer</label>
                <select
                  id="customer-select"
                  value={formData.customerId || ''}
                  onChange={(e) => {
                    const selectedCustomer = customersRef.current.find(c => c.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      customerId: e.target.value,
                      customerName: selectedCustomer?.name || ''
                    }));
                  }}
                  className="input-field mt-1"
                  required
                >
                  <option value="">Select a customer</option>
                  {/* Show all customers */}
                  {customersRef.current.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
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
                          const selectedProduct = productsRef.current.find(p => p.id === e.target.value);
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
                        {productsRef.current.map((product) => (
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
