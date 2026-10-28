import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/hooks';
import { openAuth } from '@/store/uiSlice';
import { PageLoader } from '@/components/common/Feedback.jsx';

/** Guards customer pages (login required) and admin pages (admin role required). The server enforces both independently. */
export default function ProtectedRoute({ admin = false }) {
  const { isAuthed, isAdmin, ready } = useAuth(); const loc = useLocation(); const dispatch = useDispatch();
  const needLogin = ready && !isAuthed;
  useEffect(() => { if (needLogin) dispatch(openAuth({ mode: 'login', redirectTo: loc.pathname + loc.search })); }, [needLogin, dispatch, loc.pathname, loc.search]);
  if (!ready) return <PageLoader />;
  if (!isAuthed) return <Navigate to="/" replace state={{ from: loc }} />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
