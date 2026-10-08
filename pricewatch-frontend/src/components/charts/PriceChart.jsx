import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '../../utils/format.js';
import { EmptyState } from '../common/Common.jsx';

export default function PriceChart({ points, task }) {
  const data = (points || []).filter((p) => typeof p.price === 'number').map((p) => ({ t: new Date(p.checkedAt).getTime(), price: p.price }));
  if (!data.length) return <EmptyState title="No price data yet" hint="The chart appears after the first successful check." />;
  const cur = task.currency;
  const refs = [
    task.minimumPrice != null && { y: task.minimumPrice, label: 'Min', color: '#16a36a' },
    task.maximumPrice != null && { y: task.maximumPrice, label: 'Max', color: '#e05252' },
    task.targetPrice != null && { y: task.targetPrice, label: 'Target', color: '#e99525' },
  ].filter(Boolean);
  const all = [...data.map((d) => d.price), ...refs.map((r) => r.y)];
  const pad = (Math.max(...all) - Math.min(...all)) * 0.12 || 1;
  return (
    <div className="chart-box">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 38, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pcArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#635bff" stopOpacity={0.2} /><stop offset="100%" stopColor="#635bff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eceef2" />
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a7b2' }}
            tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
          <YAxis domain={[Math.floor(Math.min(...all) - pad), Math.ceil(Math.max(...all) + pad)]} tickLine={false} axisLine={false} width={80}
            tick={{ fontSize: 11, fill: '#a1a7b2' }} tickFormatter={(v) => money(v, cur)} />
          <Tooltip contentStyle={{ background: '#151b27', border: 0, borderRadius: 10, color: '#fff', fontSize: 12 }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#aab2c0' }}
            labelFormatter={(t) => new Date(t).toLocaleString()} formatter={(v) => [money(v, cur), 'Price']} />
          {refs.map((r) => <ReferenceLine key={r.label} y={r.y} stroke={r.color} strokeDasharray="5 4" label={{ value: r.label, fill: r.color, position: 'right', fontSize: 11 }} />)}
          <Area type="monotone" dataKey="price" stroke="#635bff" strokeWidth={3} fill="url(#pcArea)" dot={data.length < 40 ? { r: 3, fill: '#fff', stroke: '#635bff', strokeWidth: 2 } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
