import { Link } from 'react-router-dom';
import { Card, PageHead, Async, DataTable, Badge } from './ui.jsx';
import { useFetch } from '@/hooks';
import { adminApi } from '@/services';
import { inr, date } from '@/utils/format';

const CARDS = [['totalOrders', 'Total Orders', '/admin/orders'], ['totalRevenue', 'Total Revenue', '/admin/orders', true], ['totalProducts', 'Products', '/admin/products'], ['totalCustomers', 'Customers', '/admin/customers'], ['pendingOrders', 'Pending Orders', '/admin/orders?status=Pending'], ['pendingReturns', 'Pending Returns', '/admin/returns'], ['inventoryAlerts', 'Inventory Alerts', '/admin/inventory'], ['refundsRequiringAttention', 'Refunds Needing Attention', '/admin/refunds']];
export default function Dashboard() {
  const st = useFetch(() => adminApi.get('dashboard'), []);
  return (
    <div><PageHead title="Dashboard" /><Async state={st}>{(d) => (
      <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{CARDS.map(([k, l, to, money]) => <Link key={k} to={to} title={d.definitions?.[k]} className="rounded-lg border bg-white p-4 shadow-sm hover:border-brand"><p className="text-xs text-neutral-600">{l}</p><p className="mt-1 font-sans text-2xl font-bold text-brand">{money ? inr(d.cards[k]) : d.cards[k]}</p></Link>)}</div>
        <p className="mt-2 text-xs text-neutral-600">Unread messages: {d.extras.unreadMessages} · Reviews to moderate: {d.extras.pendingReviews}. Hover a card for how it is calculated.</p>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <Card title="Recent orders"><DataTable empty="No orders yet" columns={[{ key: 'orderNumber', label: 'Order', render: (o) => <Link className="text-brand underline" to={`/admin/orders/${o._id}`}>{o.orderNumber}</Link> }, { key: 'customer', label: 'Customer', render: (o) => o.customer?.name }, { key: 'total', label: 'Total', render: (o) => inr(o.pricing?.total) }, { key: 'status', label: 'Status', render: (o) => <Badge status={o.status} /> }]} rows={d.recentOrders} /></Card>
          <Card title="Low stock"><DataTable empty="All stocked" columns={[{ key: 'name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'stock', label: 'Stock' }]} rows={d.lowStock} /></Card>
          <Card title="Recent returns"><DataTable empty="No returns" columns={[{ key: 'returnNumber', label: 'Return', render: (r) => <Link className="text-brand underline" to={`/admin/returns/${r._id}`}>{r.returnNumber}</Link> }, { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> }, { key: 'createdAt', label: 'Date', render: (r) => date(r.createdAt) }]} rows={d.recentReturns} /></Card>
          <Card title="Recent customers"><DataTable empty="No customers" columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'createdAt', label: 'Joined', render: (r) => date(r.createdAt) }]} rows={d.recentCustomers} /></Card>
        </div>
      </>)}</Async></div>
  );
}
