import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header.jsx';
import Footer from '@/components/layout/Footer.jsx';
import CartDrawer from '@/components/cart/CartDrawer.jsx';
import AuthModal from '@/components/layout/AuthModal.jsx';
import ScrollToTop from '@/routes/ScrollToTop.jsx';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[200] focus:rounded focus:bg-white focus:p-2">Skip to content</a>
      <ScrollToTop /><Header />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer /><CartDrawer /><AuthModal />
    </div>
  );
}
