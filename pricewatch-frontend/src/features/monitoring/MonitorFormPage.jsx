import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { monitoringService } from '../../services/index.js';
import { INTERVALS, MONITORING_TYPES } from '../../constants/index.js';
import { errorMessage, toLocalInput } from '../../utils/format.js';
import { PageHeader, Spinner } from '../../components/common/Common.jsx';

const blank = () => ({
  productUrl: '', monitoringType: 'TargetPrice', startDate: toLocalInput(new Date()),
  endDate: toLocalInput(new Date(Date.now() + 7 * 86400000)), intervalMinutes: 60,
  minimumPrice: '', maximumPrice: '', targetPrice: '', percentageThreshold: '', inApp: true, email: false,
});

function validate(f) {
  const e = {};
  try { const u = new URL(f.productUrl); if (!/^https?:$/.test(u.protocol)) throw new Error(); } catch { e.productUrl = 'Enter a valid http(s) product URL'; }
  const s = new Date(f.startDate), en = new Date(f.endDate);
  if (Number.isNaN(s.getTime())) e.startDate = 'Start date is required';
  if (Number.isNaN(en.getTime())) e.endDate = 'End date is required';
  else if (en <= s) e.endDate = 'End date must be after start date';
  else if (en <= new Date()) e.endDate = 'End date must be in the future';
  const n = (v) => (v === '' ? null : Number(v));
  if (f.monitoringType === 'PriceRange') {
    if (n(f.minimumPrice) === null && n(f.maximumPrice) === null) e.minimumPrice = 'Set a minimum and/or maximum price';
    if (n(f.minimumPrice) !== null && n(f.maximumPrice) !== null && n(f.minimumPrice) > n(f.maximumPrice)) e.minimumPrice = 'Minimum must not exceed maximum';
  }
  if (f.monitoringType === 'TargetPrice' && !(n(f.targetPrice) > 0)) e.targetPrice = 'Enter a target price greater than 0';
  if (f.monitoringType === 'PercentageDrop' && !(n(f.percentageThreshold) > 0 && n(f.percentageThreshold) <= 100)) e.percentageThreshold = 'Enter a percentage between 0 and 100';
  if (!f.inApp && !f.email) e.notification = 'Choose at least one notification channel';
  return e;
}

export default function MonitorFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { data: existing, isLoading } = useQuery({ queryKey: ['monitor', id], queryFn: () => monitoringService.get(id), enabled: editing });

  useEffect(() => {
    if (!existing) return;
    setF({
      productUrl: existing.productUrl, monitoringType: existing.monitoringType,
      startDate: toLocalInput(existing.startDate), endDate: toLocalInput(existing.endDate), intervalMinutes: existing.intervalMinutes,
      minimumPrice: existing.minimumPrice ?? '', maximumPrice: existing.maximumPrice ?? '', targetPrice: existing.targetPrice ?? '',
      percentageThreshold: existing.percentageThreshold ?? '', inApp: existing.notificationPreference?.inApp !== false, email: !!existing.notificationPreference?.email,
    });
  }, [existing]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const err = (k) => errors[k] && <span className="field-error">{errors[k]}</span>;

  async function submit(e) {
    e.preventDefault();
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) return;
    const num = (x) => (x === '' ? undefined : Number(x));
    const body = {
      productUrl: f.productUrl.trim(), monitoringType: f.monitoringType,
      startDate: new Date(f.startDate).toISOString(), endDate: new Date(f.endDate).toISOString(),
      intervalMinutes: Number(f.intervalMinutes),
      minimumPrice: f.monitoringType === 'PriceRange' ? num(f.minimumPrice) : undefined,
      maximumPrice: f.monitoringType === 'PriceRange' ? num(f.maximumPrice) : undefined,
      targetPrice: f.monitoringType === 'TargetPrice' ? num(f.targetPrice) : undefined,
      percentageThreshold: f.monitoringType === 'PercentageDrop' ? num(f.percentageThreshold) : undefined,
      notificationPreference: { inApp: f.inApp, email: f.email },
    };
    setBusy(true);
    try {
      const saved = editing ? await monitoringService.update(id, body) : await monitoringService.create(body);
      qc.invalidateQueries({ queryKey: ['monitors'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['monitor', saved.id] });
      toast.success(editing ? 'Monitor updated' : 'Monitor created');
      nav(`/monitors`);
    } catch (e2) { toast.error(errorMessage(e2)); } finally { setBusy(false); }
  }

  if (editing && isLoading) return <Spinner />;
  return (
    <div className="stack narrow-form">
      <PageHeader eyebrow="Monitors" title={editing ? 'Edit monitor' : 'Create monitor'} subtitle={editing ? 'Update the rules for this monitor.' : 'Track a product page and get alerted when its price meets your conditions.'} />
      <form className="glass card form" onSubmit={submit} noValidate>
        <label>Product URL<input value={f.productUrl} onChange={set('productUrl')} placeholder="https://www.example.com/product/123" />{err('productUrl')}</label>
        <label>Monitoring type
          <select value={f.monitoringType} onChange={set('monitoringType')}>{MONITORING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        </label>
        {f.monitoringType === 'PriceRange' && <div className="grid two">
          <label>Minimum price<input type="number" min="0" step="0.01" value={f.minimumPrice} onChange={set('minimumPrice')} /></label>
          <label>Maximum price<input type="number" min="0" step="0.01" value={f.maximumPrice} onChange={set('maximumPrice')} /></label>
          <div style={{ gridColumn: '1 / -1' }}>{err('minimumPrice')}</div></div>}
        {f.monitoringType === 'TargetPrice' && <label>Target price (notify at or below)<input type="number" min="0" step="0.01" value={f.targetPrice} onChange={set('targetPrice')} />{err('targetPrice')}</label>}
        {f.monitoringType === 'PercentageDrop' && <label>Drop threshold (%)<input type="number" min="0" max="100" step="0.1" value={f.percentageThreshold} onChange={set('percentageThreshold')} />{err('percentageThreshold')}</label>}
        <div className="grid two">
          <label>Start date<input type="datetime-local" value={f.startDate} onChange={set('startDate')} />{err('startDate')}</label>
          <label>End date<input type="datetime-local" value={f.endDate} onChange={set('endDate')} />{err('endDate')}</label>
        </div>
        <label>Check interval
          <select value={f.intervalMinutes} onChange={set('intervalMinutes')}>{INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</select>
        </label>
        <fieldset><legend>Notify me via</legend>
          <label className="check"><input type="checkbox" checked={f.inApp} onChange={set('inApp')} /> In-app</label>
          <label className="check"><input type="checkbox" checked={f.email} onChange={set('email')} /> Email</label>{err('notification')}
        </fieldset>
        <div className="row end">
          <button type="button" className="btn" onClick={() => nav(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Start monitoring'}</button>
        </div>
      </form>
    </div>
  );
}
