import React from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  DollarSign, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Department } from './types';
import { formatCurrency, getInitials } from './utils';

interface DepartmentListProps {
  departments: Department[];
  totalEmployees: number;
  onEdit?: (department: Department) => void;
  onDelete?: (department: Department) => void;
  onViewEmployees?: (department: Department) => void;
  viewMode?: 'table' | 'list';
}

export const DepartmentList: React.FC<DepartmentListProps> = ({
  departments,
  totalEmployees,
  onEdit,
  onDelete,
  onViewEmployees,
  viewMode = 'table',
}) => {
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {departments.map((department, index) => {
          const employeePercentage = totalEmployees > 0
            ? Math.round((department.employeeCount / totalEmployees) * 100)
            : 0;

          return (
            <motion.div
              key={department.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* Department Icon/Color */}
                <div
                  className="w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${department.color}20` }}
                >
                  <span
                    className="text-xl font-bold"
                    style={{ color: department.color }}
                  >
                    {department.code}
                  </span>
                </div>

                {/* Department Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#0F172A] truncate">
                      {department.name}
                    </h3>
                    <Badge
                      variant={department.isActive ? 'default' : 'secondary'}
                      className={department.isActive
                        ? 'bg-emerald-100 text-emerald-700 border-0'
                        : 'bg-white/5 text-[#475569]'
                      }
                    >
                      {department.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#475569] truncate mb-2">
                    {department.description}
                  </p>
                  
                  {/* Progress bar for employee distribution */}
                  <div className="flex items-center gap-3">
                    <Progress
                      value={employeePercentage}
                      className="h-2 flex-1 max-w-xs"
                    />
                    <span className="text-xs text-[#475569]">
                      {employeePercentage}% of workforce
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-[#94A3B8] mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-[#0F172A]">
                      {department.employeeCount}
                    </p>
                    <p className="text-xs text-[#475569]">Employees</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 text-[#94A3B8] mb-1">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-[#0F172A]">
                      {formatCurrency(department.budget / 1000)}k
                    </p>
                    <p className="text-xs text-[#475569]">Budget</p>
                  </div>

                  {/* Department Head */}
                  {department.headId && (
                    <div className="flex items-center gap-2 pl-4 border-l border-[rgba(15,23,42,0.06)]">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={department.headAvatar} />
                        <AvatarFallback
                          style={{
                            backgroundColor: `${department.color}20`,
                            color: department.color
                          }}
                        >
                          {department.headName
                            ? getInitials(
                                department.headName.split(' ')[0],
                                department.headName.split(' ')[1] || ''
                              )
                            : 'DH'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">
                          {department.headName}
                        </p>
                        <p className="text-xs text-[#475569]">Head</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => onViewEmployees?.(department)}
                  >
                    View Team
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewEmployees?.(department)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Employees
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(department)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Department
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete?.(department)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Table View
  return (
    <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-white/5/50">
            <TableHead>Department</TableHead>
            <TableHead>Head</TableHead>
            <TableHead className="text-center">Employees</TableHead>
            <TableHead className="text-center">Budget</TableHead>
            <TableHead className="text-center">Distribution</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((department) => {
            const employeePercentage = totalEmployees > 0
              ? Math.round((department.employeeCount / totalEmployees) * 100)
              : 0;

            return (
              <TableRow key={department.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `${department.color}20` }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: department.color }}
                      >
                        {department.code}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-[#0F172A]">{department.name}</p>
                      <p className="text-sm text-[#475569] truncate max-w-[200px]">
                        {department.description}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {department.headId ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={department.headAvatar} />
                        <AvatarFallback className="text-xs">
                          {department.headName
                            ? getInitials(
                                department.headName.split(' ')[0],
                                department.headName.split(' ')[1] || ''
                              )
                            : 'DH'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-200">
                        {department.headName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[#94A3B8]">Not assigned</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-[#0F172A]">
                    {department.employeeCount}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-[#0F172A]">
                    {formatCurrency(department.budget)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={employeePercentage} className="h-2 w-20" />
                    <span className="text-sm text-[#475569]">{employeePercentage}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={department.isActive ? 'default' : 'secondary'}
                    className={department.isActive
                      ? 'bg-emerald-100 text-emerald-700 border-0'
                      : 'bg-white/5 text-[#475569]'
                    }
                  >
                    {department.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewEmployees?.(department)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Employees
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(department)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete?.(department)}
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