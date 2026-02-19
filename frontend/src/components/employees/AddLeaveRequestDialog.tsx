import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInBusinessDays, addDays } from 'date-fns';
import { Calendar, FileText, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LeaveType, LeaveBalance } from './types';
import { getLeaveTypeConfig } from './utils';

const leaveRequestSchema = z.object({
  leaveType: z.enum(['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'bereavement']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Please provide a detailed reason (at least 10 characters)'),
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

interface AddLeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LeaveRequestFormValues) => void;
  leaveBalances: LeaveBalance[];
}

export const AddLeaveRequestDialog: React.FC<AddLeaveRequestDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  leaveBalances,
}) => {
  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: 'annual',
      startDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      reason: '',
    },
  });

  const watchStartDate = form.watch('startDate');
  const watchEndDate = form.watch('endDate');
  const watchLeaveType = form.watch('leaveType');

  const calculateDays = () => {
    if (!watchStartDate || !watchEndDate) return 0;
    const start = new Date(watchStartDate);
    const end = new Date(watchEndDate);
    return differenceInBusinessDays(end, start) + 1;
  };

  const totalDays = calculateDays();
  const selectedBalance = leaveBalances.find(b => b.type === watchLeaveType);

  const handleSubmit = (data: LeaveRequestFormValues) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  const leaveTypes: LeaveType[] = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'bereavement'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#0F172A]">
            Request Time Off
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Leave Type */}
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaveTypes.map((type) => {
                        const config = getLeaveTypeConfig(type);
                        const balance = leaveBalances.find(b => b.type === type);
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center justify-between w-full">
                              <span>{config.icon} {config.label}</span>
                              {balance && (
                                <Badge variant="outline" className="ml-2">
                                  {balance.available} days left
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedBalance && (
                    <FormDescription>
                      You have {selectedBalance.available} days available for {getLeaveTypeConfig(watchLeaveType).label.toLowerCase()}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                        <Input 
                          {...field} 
                          type="date" 
                          className="pl-10"
                          min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                        <Input 
                          {...field} 
                          type="date" 
                          className="pl-10"
                          min={watchStartDate || format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration Summary */}
            {totalDays > 0 && (
              <div className="bg-[#0891B2]/10 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Total Duration</span>
                  <span className="text-xl font-bold text-[#0891B2]">
                    {totalDays} business day{totalDays !== 1 ? 's' : ''}
                  </span>
                </div>
                {selectedBalance && totalDays > selectedBalance.available && (
                  <p className="text-sm text-red-600 mt-2">
                    ⚠️ You don't have enough leave balance for this duration
                  </p>
                )}
              </div>
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Please provide a reason for your leave request..."
                      className="resize-none"
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="border-2 border-dashed border-[rgba(15,23,42,0.06)] rounded-md p-6 text-center hover:border-[#22D3EE] transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm text-[#475569]">
                Drag and drop supporting documents here
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">
                PDF, DOC, or images up to 5MB
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
                disabled={selectedBalance && totalDays > selectedBalance.available}
              >
                Submit Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};