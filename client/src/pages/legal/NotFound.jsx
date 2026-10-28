import { Link } from 'react-router-dom';
import Seo from '@/components/common/Seo.jsx';
export default function NotFound() {
  return <div className="wrap py-20 text-center"><Seo title="Page not found" noindex /><p className="font-display text-6xl font-semibold text-brand">404</p><h1 className="mt-2 text-xl font-bold">We couldn't find that page</h1><Link to="/" className="btn mt-6 inline-flex">Back to home</Link></div>;
}
