import { useState } from 'react';
import Modal from './Modal.jsx';
import { Spinner } from './Feedback.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } };
  return (
    <Modal open={open} onClose={busy ? undefined : onCancel} title={title} hideClose>
      <div className="p-6">
        <h2 className="font-sans text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-neutral-700">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={busy} data-autofocus>Cancel</button>
          <button type="button" className={danger ? 'btn-danger' : 'btn'} onClick={go} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}
