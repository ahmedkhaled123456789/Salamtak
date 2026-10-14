import { useRef } from 'react';
import { toast } from 'sonner';
import { ImageUpIcon } from 'lucide-react';
import { describeMutationError } from '../../api/errors';
import { IMAGE_TYPES } from '../../api/media.api';
import { Button } from './Button';

interface ImageUploadButtonProps {
  label: string;
  maxBytes: number;
  busy?: boolean;
  /** Called with a pre-checked file; reject → the error is shown as a toast. */
  onFile: (file: File) => Promise<unknown>;
  successMessage: string;
}

/** Picks one JPEG/PNG/WebP picture. The server re-checks the real bytes; this only gives an early, clear message. */
export function ImageUploadButton({ label, maxBytes, busy, onFile, successMessage }: ImageUploadButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow picking the same file again
          if (!file) return;
          if (!IMAGE_TYPES.includes(file.type)) return void toast.error('Use a JPEG, PNG or WebP picture.');
          if (file.size > maxBytes) return void toast.error(`The picture is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
          try {
            await onFile(file);
            toast.success(successMessage);
          } catch (err) {
            toast.error(describeMutationError(err));
          }
        }} />
      <Button size="sm" variant="secondary" loading={busy} icon={<ImageUpIcon className="h-3.5 w-3.5" />} onClick={() => input.current?.click()}>
        {label}
      </Button>
    </>);

}
