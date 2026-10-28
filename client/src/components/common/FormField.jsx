import { forwardRef, useId } from 'react';

const FormField = forwardRef(function FormField({ label, error, hint, as = 'input', className = '', children, ...props }, ref) {
  const id = useId(); const Tag = as;
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <Tag id={id} ref={ref} className="input" aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} {...props}>{children}</Tag>
      {hint && !error && <p id={`${id}-h`} className="mt-1 text-xs text-neutral-600">{hint}</p>}
      {error && <p id={`${id}-e`} role="alert" className="field-error">{error}</p>}
    </div>
  );
});
export default FormField;
