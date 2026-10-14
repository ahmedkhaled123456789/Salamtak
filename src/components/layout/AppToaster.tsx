import { Toaster } from 'sonner';
import { useTheme } from '../../contexts/ThemeContext';

export function AppToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'Geist, Inter, system-ui, sans-serif',
          fontSize: '13px',
          borderRadius: '10px',
          border: '1px solid rgb(var(--line))',
          background: 'rgb(var(--elevated))',
          color: 'rgb(var(--ink))'
        }
      }} />);


}