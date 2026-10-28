import { Link } from 'react-router-dom';
import { Loader2, AlertTriangle, PackageOpen } from 'lucide-react';

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />;
export const PageLoader = () => <div className="flex min-h-[40vh] items-center justify-center text-brand" role="status"><Spinner className="h-8 w-8" /></div>;
export const Skeleton = ({ className = '' }) => <div className={`skeleton rounded ${className}`} aria-hidden="true" />;

export function EmptyState({ title, text, actionLabel, actionTo, onAction, icon: Icon = PackageOpen }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <Icon className="mb-4 h-10 w-10 text-brand/60" aria-hidden="true" />
      <h2 className="font-sans text-2xl font-bold text-black">{title}</h2>
      {text && <p className="mt-2 text-sm text-neutral-700">{text}</p>}
      {actionLabel && (actionTo ? <Link to={actionTo} className="btn mt-6 min-w-[200px]">{actionLabel}</Link> : <button type="button" onClick={onAction} className="btn mt-6 min-w-[200px]">{actionLabel}</button>)}
    </div>
  );
}
export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <AlertTriangle className="mb-3 h-9 w-9 text-red-600" aria-hidden="true" />
      <p className="font-semibold">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-outline mt-4">Try again</button>}
    </div>
  );
}
export const ProductGridSkeleton = ({ n = 8 }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{Array.from({ length: n }, (_, i) => <div key={i}><Skeleton className="aspect-[4/5] w-full" /><Skeleton className="mt-3 h-4 w-3/4" /><Skeleton className="mt-2 h-4 w-1/3" /></div>)}</div>
);
