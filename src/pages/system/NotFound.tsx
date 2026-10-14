import { Link } from 'react-router-dom';
import { CompassIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { buttonClasses } from '../../components/ui/Button';

export function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={CompassIcon}
        title="This page doesn't exist"
        description="The link may be outdated or you may not have access to this area."
        action={<Link to="/" className={buttonClasses('primary', 'sm')}>Back to dashboard</Link>} />

    </Card>);

}
