import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SemesterModal from './modals/SemesterModal';
import type { Database } from '@/integrations/supabase/database.types';

type Semester = Database['public']['Tables']['semesters']['Row'];

interface SemesterSelectorProps {
  value: string;
  onSelect: (semester: Semester | null) => void;
  required?: boolean;
}

const SemesterSelector = ({ value, onSelect, required = true }: SemesterSelectorProps) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchSemesters = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching semesters:', error);
        setLoading(false);
        return;
      }

      setSemesters(data || []);
      setLoading(false);
    };

    fetchSemesters();
  }, []);

  // Sync effect: If value exists but parent doesn't have the object (optional safety net)
  // This helps if the parent passed an ID but needs the full object back
  useEffect(() => {
    if (!loading && value && semesters.length > 0) {
      const selected = semesters.find(s => s.id === value);
      if (selected) {
        // We don't call onSelect here to avoid infinite loops,
        // but it confirms the data is present.
      }
    }
  }, [loading, value, semesters]);

  const handleSelect = (semesterId: string) => {
    if (semesterId === 'create-new') {
      setShowCreateModal(true);
      return;
    }

    const semester = semesters.find(s => s.id === semesterId);
    onSelect(semester || null);
  };

  const handleSemesterCreated = (newSemester: Semester) => {
    setSemesters(prev => [...prev, newSemester]);
    onSelect(newSemester);
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Term {required && <span className="text-destructive">*</span>}</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading terms..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Label>Term {required && <span className="text-destructive">*</span>}</Label>
        <Select
          // 1. KEY FIX: This forces a re-render when data loads or value changes
          // effectively "waking up" the component to display the correct label.
          key={`${value || 'empty'}-${semesters.length}`}
          value={value || ""}
          onValueChange={handleSelect}
          required={required}
        >
          <SelectTrigger>
            <SelectValue placeholder={semesters.length === 0 ? "No terms available" : "Select term"} />
          </SelectTrigger>
          <SelectContent>
            {semesters.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No terms available. Create one below.
              </div>
            ) : (
              semesters.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>
                  {semester.code} - {semester.name}
                </SelectItem>
              ))
            )}
            <div className="border-t mt-1 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-sm h-8"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Term
              </Button>
            </div>
          </SelectContent>
        </Select>
      </div>

      <SemesterModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSemesterCreated}
      />
    </>
  );
};

export default SemesterSelector;