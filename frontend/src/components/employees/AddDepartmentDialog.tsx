import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, DollarSign, Palette, FileText, User } from 'lucide-react';
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
import { Employee, Department } from './types';

const departmentFormSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(5, 'Code must be at most 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  headId: z.string().optional(),
  budget: z.string().min(1, 'Budget is required'),
  color: z.string().min(1, 'Color is required'),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

interface AddDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onSubmit: (data: DepartmentFormValues) => void;
  editingDepartment?: Department;
}

const colorOptions = [
  { value: '#23D3EE', label: 'Teal' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#EF4444', label: 'Red' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#FBBF23', label: 'Gold' },
];

export const AddDepartmentDialog: React.FC<AddDepartmentDialogProps> = ({
  open,
  onOpenChange,
  employees,
  onSubmit,
  editingDepartment,
}) => {
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: editingDepartment?.name || '',
      code: editingDepartment?.code || '',
      description: editingDepartment?.description || '',
      headId: editingDepartment?.headId || '',
      budget: editingDepartment?.budget?.toString() || '',
      color: editingDepartment?.color || '#23D3EE',
    },
  });

  const handleSubmit = (data: DepartmentFormValues) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  const managers = employees.filter(emp => 
    emp.position.toLowerCase().includes('manager') || 
    emp.position.toLowerCase().includes('lead') ||
    emp.position.toLowerCase().includes('head')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {editingDepartment ? 'Edit Department' : 'Create New Department'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Department Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input {...field} className="pl-10" placeholder="Engineering" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="ENG" 
                        maxLength={5}
                        className="uppercase"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe the department's responsibilities and focus areas..."
                      className="resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Head</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <SelectValue placeholder="Select department head" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No Head Assigned</SelectItem>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.firstName} {manager.lastName} - {manager.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only managers and leads are shown
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Budget</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input {...field} type="number" className="pl-10" placeholder="500000" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

                        <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => field.onChange(color.value)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            field.value === color.value 
                              ? 'border-gray-900 scale-110' 
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                className="bg-[#23D3EE] hover:bg-[#23D3EE]/90 text-white"
              >
                {editingDepartment ? 'Update Department' : 'Create Department'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};