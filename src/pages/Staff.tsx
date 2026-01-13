import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StaffTable } from '@/components/staff/StaffTable';

export default function Staff() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">
            Manage team members and portal access
          </p>
        </div>

        <StaffTable />
      </div>
    </DashboardLayout>
  );
}
