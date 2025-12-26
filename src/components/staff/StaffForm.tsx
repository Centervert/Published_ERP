import { useState, useEffect } from 'react';
import { StaffWithUser, useStaff } from '@/hooks/useStaff';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const DEPARTMENTS = [
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'management', label: 'Management' },
  { value: 'information_technology', label: 'Information Technology' },
  { value: 'operations', label: 'Operations' },
  { value: 'executive', label: 'Executive' },
];

interface StaffFormProps {
  open: boolean;
  onClose: () => void;
  staff?: StaffWithUser | null;
}

export function StaffForm({ open, onClose, staff }: StaffFormProps) {
  const { createStaff, updateStaff } = useStaff();
  const isEditing = !!staff;

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    title: 'Author Success Coach',
    department: 'sales',
  });

  useEffect(() => {
    if (staff) {
      setFormData({
        full_name: staff.full_name,
        email: staff.email,
        phone: staff.phone || '',
        title: staff.title || 'Author Success Coach',
        department: staff.department || 'sales',
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        title: 'Author Success Coach',
        department: 'sales',
      });
    }
  }, [staff, open]);

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.email) return;

    if (isEditing && staff) {
      await updateStaff.mutateAsync({
        id: staff.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        title: formData.title || null,
        department: formData.department,
      });
    } else {
      await createStaff.mutateAsync({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        title: formData.title || null,
        department: formData.department,
        user_id: null,
        active: true,
      });
    }
    onClose();
  };

  const isPending = createStaff.isPending || updateStaff.isPending;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Staff Member' : 'Add Staff Member'}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Smith"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jsmith@authorservices.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="407-555-1234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Author Success Coach"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={formData.department}
              onValueChange={(v) => setFormData({ ...formData, department: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isPending || !formData.full_name || !formData.email}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Staff'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
