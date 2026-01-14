import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/database.types';
import { useIsMobile } from '@/hooks/use-mobile';

type Semester = Database['public']['Tables']['semesters']['Row'];

interface SemesterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (semester: Semester) => void;
  required?: boolean;
}

const SemesterModal = ({ open, onClose, onSuccess, required = true }: SemesterModalProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    start_date: '',
    end_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.code.trim()) {
        toast({
          title: 'Required Field Missing',
          description: 'Please enter a semester code',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!formData.name.trim()) {
        toast({
          title: 'Required Field Missing',
          description: 'Please enter a semester name',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!formData.start_date) {
        toast({
          title: 'Required Field Missing',
          description: 'Please select a start date',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!formData.end_date) {
        toast({
          title: 'Required Field Missing',
          description: 'Please select an end date',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Validate dates
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

      if (endDate <= startDate) {
        toast({
          title: 'Error',
          description: 'End date must be after start date',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('semesters')
        .insert({
          code: formData.code,
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Term created successfully',
      });

      // Reset form
      setFormData({
        code: '',
        name: '',
        start_date: '',
        end_date: '',
      });

      onSuccess(data);
    } catch (error: any) {
      console.error('Error creating semester:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create term',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        code: '',
        name: '',
        start_date: '',
        end_date: '',
      });
      setStartCalendarOpen(false);
      setEndCalendarOpen(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'max-w-[calc(90vw-2rem)]' : 'max-w-xl'} rounded-xl`}>
        <DialogHeader>
          <DialogTitle>Create New Term</DialogTitle>
          <DialogDescription>
            Add a new semester/term for projects and classes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" required>
              Code
            </Label>
            <Input
              id="code"
              placeholder="W26"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              e.g., W26 (Winter 2026), F27 (Fall 2027)
              {!isMobile
                && ', Su26 (Summer 2026)'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" required>
              Name
            </Label>
            <Input
              id="name"
              placeholder="Winter 2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label required>
                Start Date
              </Label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.start_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date
                      ? format(new Date(formData.start_date), 'PPP')
                      : <span>Pick a start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(selectedDate) => {
                      setFormData({ ...formData, start_date: selectedDate ? new Date(selectedDate).toISOString() : '' });
                      setStartCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label required>
                End Date
              </Label>
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.end_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date
                      ? format(new Date(formData.end_date), 'PPP')
                      : <span>Pick an end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={formData.end_date ? new Date(formData.end_date) : undefined}
                    onSelect={(selectedDate) => {
                      setFormData({ ...formData, end_date: selectedDate ? new Date(selectedDate).toISOString() : '' });
                      setEndCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Term'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SemesterModal;