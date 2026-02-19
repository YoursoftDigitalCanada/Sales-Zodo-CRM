import React from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Mail, 
  Phone,
  ArrowUpDown
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Employee } from './types';
import { 
  getEmployeeStatusConfig, 
  getEmploymentTypeConfig, 
  getInitials,
  formatCurrency 
} from './utils';

interface EmployeeTableProps {
  employees: Employee[];
  selectedIds: string[];
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: string, selected: boolean) => void;
  onView?: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onView,
  onEdit,
  onDelete,
  onSort,
  sortField,
  sortDirection,
}) => {
  const allSelected = employees.length > 0 && selectedIds.length === employees.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < employees.length;

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 hover:bg-transparent"
      onClick={() => onSort?.(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="w-12">
              <Checkbox 
                checked={allSelected}
                onCheckedChange={onSelectAll}
                ref={(ref) => {
                  if (ref) {
                    (ref as HTMLButtonElement).dataset.indeterminate = someSelected ? 'true' : 'false';
                  }
                }}
              />
            </TableHead>
            <TableHead>
              <SortableHeader field="name">Employee</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="department">Department</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="status">Status</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="type">Type</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="joinDate">Join Date</SortableHeader>
            </TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const statusConfig = getEmployeeStatusConfig(employee.status);
            const employmentConfig = getEmploymentTypeConfig(employee.employmentType);
            const isSelected = selectedIds.includes(employee.id);

            return (
              <TableRow 
                key={employee.id}
                className={isSelected ? 'bg-[#23D3EE]/5' : ''}
              >
                <TableCell>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectOne(employee.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.avatar} />
                      <AvatarFallback className="bg-[#23D3EE]/10 text-[#23D3EE]">
                        {getInitials(employee.firstName, employee.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{employee.position}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-700">{employee.departmentName}</span>
                </TableCell>
                <TableCell>
                  <Badge className={`${statusConfig.color} border-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1.5`} />
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={employmentConfig.color}>
                    {employmentConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600">
                  {format(employee.joinDate, 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView?.(employee)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(employee)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete?.(employee)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};