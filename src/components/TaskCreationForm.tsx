import React, { useState } from 'react';

export interface TaskFormValues {
  purchaseOrderId: string;
  type: string;
  assignedTo: string;
  details: string;
  deadline: string;
}

interface TaskCreationFormProps {
  purchaseOrders: { _id: string; name: string }[];
  onCreate: (values: TaskFormValues) => void;
}

const typeOptions = [
  'Picking',
  'Packing',
  'Quality Check',
  'Shipping',
];

export const TaskCreationForm: React.FC<TaskCreationFormProps> = ({ purchaseOrders, onCreate }) => {
  const [form, setForm] = useState<TaskFormValues>({
    purchaseOrderId: purchaseOrders[0]?._id || '',
    type: typeOptions[0],
    assignedTo: '',
    details: '',
    deadline: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(form);
    setForm({ ...form, assignedTo: '', details: '', deadline: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 space-y-4">
      <h2 className="font-bold mb-2 text-lg">Create Task</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Purchase Order</label>
          <select
            name="purchaseOrderId"
            value={form.purchaseOrderId}
            onChange={handleChange}
            className="input-field w-full"
            required
          >
            {purchaseOrders.map((po) => (
              <option key={po._id} value={po._id}>{po.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="input-field w-full"
            required
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Assigned To</label>
          <input
            name="assignedTo"
            value={form.assignedTo}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Deadline</label>
          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Details</label>
          <input
            name="details"
            value={form.details}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary w-full md:w-auto">Create Task</button>
    </form>
  );
};
