import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BadgeCheckIcon, CalendarClockIcon, CheckIcon, FileTextIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DetailList } from '../../components/ui/DetailList';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { DocumentViewer } from '../../components/nurses/DocumentViewer';
import { useNurses, useVerificationDetail } from '../../hooks/queries';
import { useApproveDocument, useApproveNurse, useRejectDocument, useRejectNurse } from '../../hooks/mutations';
import { useSession } from '../../contexts/SessionContext';
import { describeMutationError } from '../../api/errors';
import { formatDate, formatRelative } from '../../utils/date';
import { nurseName, titleCase } from '../../utils/people';
import { cn } from '../../utils/cn';
import type { NurseDocument } from '../../api/types';

type NurseDecision = 'approve' | 'reject' | null;

export function NurseVerification() {
  const [params, setParams] = useSearchParams();
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const queue = useNurses({ verificationStatus: 'UNDER_REVIEW', page, limit: 20 });
  const selectedId = params.get('nurse');
  const items = useMemo(() => queue.data?.items ?? [], [queue.data]);
  const detail = useVerificationDetail(selectedId);

  const [viewing, setViewing] = useState<NurseDocument | null>(null);
  const [nurseDecision, setNurseDecision] = useState<NurseDecision>(null);
  const [rejectingDoc, setRejectingDoc] = useState<NurseDocument | null>(null);

  const approveNurse = useApproveNurse();
  const rejectNurse = useRejectNurse();
  const approveDoc = useApproveDocument();
  const rejectDoc = useRejectDocument();

  const select = (id: string) => setParams({ nurse: id }, { replace: true });

  // Land on the first applicant when nothing is selected (or the selected one just left the queue).
  useEffect(() => {
    if (!queue.data) return;
    if (!selectedId && items.length) select(items[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.data, selectedId, items]);

  const nurse = detail.data?.nurse;
  const docs = detail.data?.documents ?? [];
  const problem = docs.filter((d) => d.status === 'EXPIRED' || d.status === 'REJECTED');
  const awaiting = docs.filter((d) => d.status === 'PENDING' || d.status === 'UNDER_REVIEW').length;
  const reviewable = nurse?.verificationStatus === 'UNDER_REVIEW';

  const header =
  <PageHeader
    title="Nurse Verification"
    description="Review credentials before a nurse can accept bookings. Every decision is audit-logged."
    meta={queue.data && <span className="text-[12px] text-ink-3"><span className="num font-semibold text-ink">{queue.data.meta.total}</span> awaiting review</span>} />;



  if (queue.isError) {
    return (
      <>
        {header}
        <Card><ApiErrorState error={queue.error} what="the verification queue" onRetry={() => queue.refetch()} /></Card>
      </>);

  }

  if (!queue.isLoading && queue.data && queue.data.meta.total === 0 && !selectedId) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={BadgeCheckIcon}
            title="No pending verification"
            description="No nurse is waiting for review. Applicants appear here once they submit their profile and documents."
            action={<Link to="/nurses" className={buttonClasses('secondary', 'sm')}>View Nurses</Link>} />

        </Card>
      </>);

  }

  const done = (message: string) => {
    toast.success(message);
    setNurseDecision(null);
    setRejectingDoc(null);
  };
  const fail = (e: unknown) => toast.error(describeMutationError(e));

  return (
    <>
      {header}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <Card flush className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:self-start">
          <div className="overflow-y-auto">
            {queue.isLoading ?
            <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, i) =>
              <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div>
                  </div>
              )}
              </div> :

            <ul className="p-1.5">
                {items.map((n) =>
              <li key={n.id}>
                    <button
                  type="button"
                  onClick={() => select(n.id)}
                  aria-current={n.id === selectedId}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors', n.id === selectedId ? 'bg-subtle' : 'hover:bg-subtle/60')}>

                      <Avatar name={nurseName(n)} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{nurseName(n)}</p>
                        <p className="truncate text-[12px] text-ink-3">{n.yearsOfExperience}y exp.{n.city ? ` · ${n.city}` : ''}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-ink-3">{formatRelative(n.updatedAt).replace(' ago', '')}</span>
                    </button>
                  </li>
              )}
              </ul>
            }
          </div>
          <Pagination meta={queue.data?.meta} onPage={setPage} busy={queue.isFetching} />
        </Card>

        {!selectedId ?
        <Card><EmptyState compact icon={BadgeCheckIcon} title="Select an applicant" description="Choose a nurse on the left to review their documents." /></Card> :
        detail.isError ?
        <Card><ApiErrorState error={detail.error} what="this applicant" onRetry={() => detail.refetch()} /></Card> :
        detail.isLoading || !nurse ?
        <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div></div>
              <Skeleton className="h-32 w-full" />
              <div className="grid grid-cols-2 gap-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
            </div>
          </Card> :

        <div className="min-w-0 space-y-5">
            <Card flush>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <Avatar name={nurseName(nurse)} size="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">{nurseName(nurse)}</h2>
                    <StatusBadge status={nurse.verificationStatus} />
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    {nurse.yearsOfExperience} years experience · Registered {formatRelative(nurse.createdAt)}
                  </p>
                  {nurse.statusReason && <p className="mt-1 text-[12px] text-ink-3">Note: {nurse.statusReason}</p>}
                </div>
              </div>
              {problem.length > 0 &&
            <div className="mx-5 mb-5 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-[12.5px]">
                  <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                  <p className="text-ink-2">
                    <span className="font-medium text-danger">{problem.map((d) => `${titleCase(d.type)} ${d.status.toLowerCase()}`).join(', ')}.</span> The server may refuse approval until a valid document is on file.
                  </p>
                </div>
            }
            </Card>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Card title="Contact & personal">
                <DetailList
                items={[
                { label: 'Email', value: nurse.user?.email ?? '—' },
                { label: 'Phone', value: <span className="num">{nurse.user?.phone ?? '—'}</span> },
                { label: 'Gender', value: nurse.gender ? titleCase(nurse.gender) : '—' },
                { label: 'City', value: nurse.city ?? '—' },
                { label: 'Languages', value: nurse.languages.length ? nurse.languages.join(', ') : '—' }]
                } />

              </Card>
              <Card title="Professional">
                <DetailList
                items={[
                { label: 'Experience', value: `${nurse.yearsOfExperience} years` },
                { label: 'Specializations', value: nurse.specializations.length ? nurse.specializations.join(', ') : '—' },
                { label: 'Service radius', value: `${nurse.serviceRadiusKm} km` },
                { label: 'About', value: <span className="font-normal">{nurse.bio ?? '—'}</span> }]
                } />

              </Card>
            </div>

            <Card title="Documents" description={`${docs.length} uploaded · ${awaiting} awaiting review`}>
              {docs.length === 0 ?
            <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[12.5px] text-ink-3">No documents uploaded.</p> :

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {docs.map((doc) =>
              <div key={doc.id} className={cn('flex flex-col rounded-lg border p-4', doc.status === 'EXPIRED' || doc.status === 'REJECTED' ? 'border-danger/25' : 'border-line')}>
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-subtle/70">
                          <FileTextIcon className="h-4 w-4 text-ink-2" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-ink">{titleCase(doc.type)}</p>
                          <p className="truncate text-[11.5px] text-ink-3">Uploaded {formatDate(doc.createdAt)}</p>
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
                        <div>
                          <p className="text-ink-3">Number</p>
                          <p className="num truncate font-mono text-ink-2">{doc.documentNumber ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-ink-3">Expiry</p>
                          <p className={cn('num flex items-center gap-1', doc.status === 'EXPIRED' ? 'font-medium text-danger' : 'text-ink-2')}>
                            <CalendarClockIcon className="h-3 w-3" aria-hidden />
                            {doc.expiresAt ? formatDate(doc.expiresAt) : 'No expiry'}
                          </p>
                        </div>
                      </div>
                      {doc.rejectionReason && <p className="mt-2 text-[11.5px] text-danger">Rejected: {doc.rejectionReason}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setViewing(doc)}>Preview</Button>
                        {doc.status !== 'VERIFIED' &&
                    <Button size="sm" variant="success" loading={approveDoc.isPending && approveDoc.variables?.id === doc.id} icon={<CheckIcon className="h-3.5 w-3.5" />} onClick={() => approveDoc.mutate({ id: doc.id }, { onSuccess: () => toast.success('Document approved'), onError: fail })}>
                            Approve
                          </Button>
                    }
                        {doc.status !== 'REJECTED' &&
                    <Button size="sm" variant="danger" onClick={() => setRejectingDoc(doc)}>Reject</Button>
                    }
                      </div>
                    </div>
              )}
                </div>
            }
            </Card>

            <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-line bg-elevated/95 p-3 shadow-pop backdrop-blur sm:flex-row sm:items-center">
              <p className="flex-1 px-1 text-[12.5px] text-ink-3">
                Deciding as <span className="font-medium text-ink">{user.name}</span>.{' '}
                {reviewable ? 'The decision is recorded in the audit log.' : 'This nurse is not currently awaiting review.'}
              </p>
              <div className="flex gap-2">
                <Button variant="danger" disabled={!reviewable} icon={<XIcon className="h-3.5 w-3.5" />} onClick={() => setNurseDecision('reject')}>
                  Reject
                </Button>
                <Button variant="primary" disabled={!reviewable} icon={<CheckIcon className="h-3.5 w-3.5" />} onClick={() => setNurseDecision('approve')}>
                  Approve nurse
                </Button>
              </div>
            </div>
          </div>
        }
      </div>

      <DocumentViewer document={viewing} ownerName={nurse ? nurseName(nurse) : ''} viewerName={user.name} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={Boolean(nurseDecision)}
        onClose={() => setNurseDecision(null)}
        loading={approveNurse.isPending || rejectNurse.isPending}
        tone={nurseDecision === 'reject' ? 'danger' : 'primary'}
        requireReason={nurseDecision === 'reject'}
        reasonLabel="Reason shared with the applicant"
        title={nurseDecision === 'approve' ? `Approve ${nurse ? nurseName(nurse) : ''}?` : `Reject ${nurse ? nurseName(nurse) : ''}?`}
        description={
        nurseDecision === 'approve' ?
        'They are marked verified and can start accepting bookings. The server checks that the required documents are valid.' :
        'The verification is closed as rejected. The applicant can correct their documents and submit again.'
        }
        confirmLabel={nurseDecision === 'approve' ? 'Approve nurse' : 'Reject application'}
        onConfirm={(reason) => {
          if (!nurse || !nurseDecision) return;
          const name = nurseName(nurse);
          if (nurseDecision === 'approve') {
            approveNurse.mutate({ id: nurse.id }, { onSuccess: () => done(`${name} verified`), onError: fail });
          } else {
            rejectNurse.mutate({ id: nurse.id, reason }, { onSuccess: () => done(`${name}'s application rejected`), onError: fail });
          }
        }} />


      <ConfirmDialog
        open={Boolean(rejectingDoc)}
        onClose={() => setRejectingDoc(null)}
        loading={rejectDoc.isPending}
        tone="danger"
        requireReason
        reasonLabel="Reason shown to the nurse"
        title={`Reject ${rejectingDoc ? titleCase(rejectingDoc.type) : 'document'}?`}
        description="The nurse is asked to upload a corrected document."
        confirmLabel="Reject document"
        onConfirm={(reason) => {
          if (!rejectingDoc) return;
          rejectDoc.mutate({ id: rejectingDoc.id, reason }, { onSuccess: () => done('Document rejected'), onError: fail });
        }} />

    </>);

}
