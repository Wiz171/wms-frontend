import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import { TaskForm } from '../components/TaskForm';
import type { TaskFormValues } from '../components/TaskForm';
import { TaskTable } from '../components/TaskTable';
import type { Task } from '../components/TaskTable';

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) fetchTasks(selectedOrder);
  }, [selectedOrder]);

  const fetchOrders = async () => {
    try {
      const data = await apiRequest('/api/purchase-orders');
      setOrders(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedOrder(data[0]._id);
    } catch {
      toast.error('Failed to fetch purchase orders');
    }
  };

  const fetchTasks = async (poId: string) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/api/purchase-orders/${poId}/tasks`);
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (values: TaskFormValues) => {
    try {
      const newTask = await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          purchaseOrderId: values.orderId,
        }),
      });
      setTasks((prev) => Array.isArray(prev) && newTask && typeof newTask === 'object' ? [...prev, newTask as Task] : prev);
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiRequest(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
      toast.success('Task status updated');
    } catch {
      toast.error('Failed to update status');
    }
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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <label className="font-medium mr-2">PO:</label>
          <select
            value={selectedOrder}
            onChange={(e) => setSelectedOrder(e.target.value)}
            className="input-field"
          >
            {orders.map((order) => (
              <option key={order._id} value={order._id}>
                {order._id.slice(-6)} | {order.status} | {order.deliveryDate?.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <TaskForm orders={orders} onSubmit={handleCreateTask} />
      <TaskTable tasks={tasks} onStatusChange={handleStatusChange} />
    </div>
  );
}