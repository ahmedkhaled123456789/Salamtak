import { useEffect, useState } from 'react';
import { EyeIcon, LockIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Skeleton } from '../ui/Skeleton';
import { getFileAccessUrl } from '../../api/verification.api';
import { resolveBackendUrl } from '../../api/client';
import { describeMutationError } from '../../api/errors';
import { formatDate } from '../../utils/date';
import { titleCase } from '../../utils/people';
import type { NurseDocument } from '../../api/types';

interface DocumentViewerProps {
  document: NurseDocument | null;
  ownerName: string;
  viewerName: string;
  onClose: () => void;
}

type ViewState = { phase: 'loading' } | { phase: 'ready'; url: string; mime: string } | { phase: 'error'; message: string };

/**
 * Secure document preview. At open time it asks the backend for a short-lived signed link (the backend
 * checks that this role may read the file), downloads the bytes into an in-memory blob and shows that.
 * The signed link is never rendered, stored or logged, and the blob URL is revoked on close, so nothing
 * persists after the dialog is dismissed. The file is view-only: there is no download control.
 */
export function DocumentViewer({ document, ownerName, viewerName, onClose }: DocumentViewerProps) {
  const [state, setState] = useState<ViewState>({ phase: 'loading' });
  const fileId = document?.fileId;

  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    setState({ phase: 'loading' });

    (async () => {
      try {
        const { url } = await getFileAccessUrl(fileId);
        const res = await fetch(resolveBackendUrl(url), { cache: 'no-store', credentials: 'omit', signal: controller.signal });
        if (!res.ok) throw new Error('file-unavailable');
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ phase: 'ready', url: objectUrl, mime: blob.type });
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        const message = err instanceof Error && err.message === 'file-unavailable' ? 'The file link could not be opened. It may have expired — close and try again.' : describeMutationError(err, "The document couldn't be loaded.");
        setState({ phase: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  const title = document ? titleCase(document.type) : '';

  return (
    <Modal
      open={Boolean(document)}
      onClose={onClose}
      widthClassName="sm:max-w-[760px]"
      title={title}
      description={document && `${ownerName} · uploaded ${formatDate(document.createdAt)}${document.expiresAt ? ` · expires ${formatDate(document.expiresAt)}` : ''}`}
      footer={
      <>
          <span className="mr-auto inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <EyeIcon className="h-3.5 w-3.5" aria-hidden />
            Access is audited · {viewerName}
          </span>
          <Button onClick={onClose}>Close</Button>
        </>
      }>

      {document &&
      <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-line bg-subtle/60 px-3 py-2 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <LockIcon className="h-3.5 w-3.5" aria-hidden />
              Private file · view-only · opened with a short-lived link
            </span>
            <StatusBadge status={document.status} />
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-line bg-canvas select-none">
            {state.phase === 'loading' &&
          <div className="space-y-3 p-6" aria-busy="true" aria-label="Loading document">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-56 w-full" />
              </div>
          }
            {state.phase === 'error' &&
          <p role="alert" className="px-6 py-16 text-center text-[13px] text-ink-2">{state.message}</p>
          }
            {state.phase === 'ready' && state.mime.startsWith('image/') &&
          <img src={state.url} alt={`${title} for ${ownerName}`} className="mx-auto max-h-[60vh] w-auto object-contain" draggable={false} />
          }
            {state.phase === 'ready' && state.mime === 'application/pdf' &&
          <iframe src={state.url} title={`${title} for ${ownerName}`} className="h-[60vh] w-full" />
          }
            {state.phase === 'ready' && !state.mime.startsWith('image/') && state.mime !== 'application/pdf' &&
          <p className="px-6 py-16 text-center text-[13px] text-ink-2">This file type can't be previewed here.</p>
          }
          </div>
        </div>
      }
    </Modal>);

}
