import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface PurchaseOrder {
  id: string;
  items: any[];
  createdBy: any;
  date: string;
  deliveryDate: string;
  notes?: string;
  status: 'pending' | 'processing' | 'shipping' | 'delivered';
  doCreated?: boolean;
  invoiceUrl?: string;
}

export default function POManagementPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(JSON.parse(localStorage.getItem('user') || '{}'));
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/purchase-orders');
      setOrders(Array.isArray(data) ? data.map((o: any) => ({ ...o, id: o._id })) : []);
    } catch {
      toast.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiRequest(`/api/purchase-orders/${id}/approve`, { method: 'PATCH' });
      toast.success('PO approved');
      fetchOrders();
    } catch {
      toast.error('Failed to approve PO');
    }
  };

  const handleCreateDO = async (id: string) => {
    try {
      await apiRequest(`/api/purchase-orders/${id}/do`, { method: 'PATCH' });
      toast.success('DO created');
      fetchOrders();
    } catch {
      toast.error('Failed to create DO');
    }
  };

  const handleAdvance = async (id: string, next: 'shipping' | 'delivered') => {
    try {
      await apiRequest(`/api/purchase-orders/${id}/advance`, { method: 'PATCH', body: JSON.stringify({ next }) });
      toast.success('PO status updated');
      fetchOrders();
    } catch {
      toast.error('Failed to advance PO status');
    }
  };

  const handleGenerateInvoice = async (id: string) => {
    try {
      const res = await apiRequest(`/api/purchase-orders/${id}/invoice`, { method: 'PATCH' }) as { invoiceUrl?: string };
      toast.success('Invoice generated');
      fetchOrders();
      if (res.invoiceUrl) window.open(res.invoiceUrl, '_blank');
    } catch {
      toast.error('Failed to generate invoice');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Purchase Orders</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Delivery Date</th>
              <th>DO</th>
              <th>Invoice</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.id.slice(-6)}</td>
                <td>{order.status}</td>
                <td>{order.deliveryDate ? dayjs(order.deliveryDate).format('YYYY-MM-DD') : '--'}</td>
                <td>{order.doCreated ? 'Yes' : 'No'}</td>
                <td>{order.invoiceUrl ? <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer">View</a> : '--'}</td>
                <td>
                  {currentUser?.role === 'manager' && order.status === 'pending' && (
                    <button onClick={() => handleApprove(order.id)} className="btn-primary btn-xs">Approve</button>
                  )}
                  {currentUser?.role === 'manager' && order.status === 'processing' && (
                    <button onClick={() => toast('Show create task UI here')} className="btn-primary btn-xs ml-2">Create Task</button>
                  )}
                  {currentUser?.role === 'user' && order.status === 'processing' && !order.doCreated && (
                    <button onClick={() => handleCreateDO(order.id)} className="btn-primary btn-xs ml-2">Create DO</button>
                  )}
                  {currentUser?.role === 'user' && order.status === 'processing' && order.doCreated && (
                    <button onClick={() => handleAdvance(order.id, 'shipping')} className="btn-primary btn-xs ml-2">Mark as Shipping</button>
                  )}
                  {currentUser?.role === 'user' && order.status === 'shipping' && (
                    <button onClick={() => handleAdvance(order.id, 'delivered')} className="btn-primary btn-xs ml-2">Mark as Delivered</button>
                  )}
                  {currentUser?.role === 'manager' && order.status === 'delivered' && !order.invoiceUrl && (
                    <button onClick={() => handleGenerateInvoice(order.id)} className="btn-primary btn-xs ml-2">Generate Invoice</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
