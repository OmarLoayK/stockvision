'use client';

import { useEffect, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import type { Alert } from '@/types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<Alert['type']>('PRICE_ABOVE');
  const [threshold, setThreshold] = useState('');

  const fetchAlerts = () =>
    fetch('/api/alerts').then((r) => r.json()).then(setAlerts).finally(() => setLoading(false));

  useEffect(() => { fetchAlerts(); }, []);

  const createAlert = async () => {
    if (!symbol || !threshold) return;
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: symbol.toUpperCase(), type, threshold: parseFloat(threshold) }),
    });
    setSymbol(''); setThreshold('');
    fetchAlerts();
  };

  const deleteAlert = async (id: string) => {
    await fetch('/api/alerts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAlerts();
  };

  const alertTypeLabel: Record<Alert['type'], string> = {
    PRICE_ABOVE: 'Price above',
    PRICE_BELOW: 'Price below',
    PERCENT_CHANGE: '% change',
    VOLUME_SPIKE: 'Volume spike',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Price Alerts</h1>
        <p className="text-zinc-400 text-sm mt-1">Get notified when conditions are met</p>
      </div>

      {/* Create Alert */}
      <Card>
        <CardHeader><CardTitle>Create Alert</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-zinc-400 font-medium block mb-1">Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="AAPL"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs text-zinc-400 font-medium block mb-1">Condition</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Alert['type'])}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PRICE_ABOVE">Price above</option>
                <option value="PRICE_BELOW">Price below</option>
                <option value="PERCENT_CHANGE">% change</option>
                <option value="VOLUME_SPIKE">Volume spike</option>
              </select>
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-zinc-400 font-medium block mb-1">Threshold</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="150.00"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button onClick={createAlert}>
              <Plus className="w-4 h-4" />
              Create Alert
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader><CardTitle>Active Alerts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No alerts set. Create one above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">{alert.symbol}</p>
                      <p className="text-xs text-zinc-400">
                        {alertTypeLabel[alert.type]} {formatCurrency(alert.threshold)}
                      </p>
                    </div>
                    <Badge variant={alert.triggered ? 'positive' : 'default'}>
                      {alert.triggered ? 'Triggered' : 'Watching'}
                    </Badge>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteAlert(alert.id)}>
                    <Trash2 className="w-4 h-4 text-zinc-500 hover:text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
