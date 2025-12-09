'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';

interface DiscordOrder {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
  resourceId: string;
  resourceName: string;
  quantity: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  fulfilledBy: string | null;
  fulfilledAt: Date | null;
  createdAt: Date;
  notes: string | null;
}

export default function DiscordOrdersPanel() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<DiscordOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'fulfilled' | 'cancelled'>('pending');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/discord/orders?status=${statusFilter}`, {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch Discord orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrders();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, statusFilter]);

  const handleFulfill = async (orderId: string) => {
    if (!confirm('Mark this order as fulfilled?')) return;

    setProcessingOrderId(orderId);
    try {
      const response = await fetch(`/api/discord/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fulfill' }),
      });

      if (response.ok) {
        await fetchOrders();
      } else {
        const error = await response.json();
        alert(`Failed to fulfill order: ${error.error}`);
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      alert('Failed to fulfill order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Cancel this order and restore stock?')) return;

    setProcessingOrderId(orderId);
    try {
      const response = await fetch(`/api/discord/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (response.ok) {
        await fetchOrders();
      } else {
        const error = await response.json();
        alert(`Failed to cancel order: ${error.error}`);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          📦 Discord Orders
        </h2>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-2xl">📦</span>
            Discord Orders
          </h2>
          <button
            onClick={fetchOrders}
            className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {(['all', 'pending', 'fulfilled', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No {statusFilter !== 'all' ? statusFilter : ''} orders found</p>
            <p className="text-sm mt-2">Orders placed via Discord will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {order.resourceName}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {order.quantity.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Ordered by:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {order.username}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Created:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {order.status === 'fulfilled' && order.fulfilledBy && (
                        <>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Fulfilled by:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {order.fulfilledBy}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Fulfilled:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {order.fulfilledAt && formatDistanceToNow(new Date(order.fulfilledAt), { addSuffix: true })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {order.notes && (
                      <div className="mt-3 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Notes:</span>
                        <p className="ml-2 italic text-gray-700 dark:text-gray-300">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleFulfill(order.id)}
                        disabled={processingOrderId === order.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        {processingOrderId === order.id ? '...' : '✓ Fulfill'}
                      </button>
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={processingOrderId === order.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        {processingOrderId === order.id ? '...' : '✗ Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
