import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { openDrawer } from '@/store/cartSlice';

/** The cart lives in the slide-in drawer (as designed); /cart simply opens it over the home page. */
export default function Cart() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(openDrawer()); }, [dispatch]);
  return <Navigate to="/" replace />;
}
