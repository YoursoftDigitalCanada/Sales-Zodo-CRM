import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  DollarSign, 
  MoreVertical, 
  Edit, 
  Trash2,
  UserCircle,
  TrendingUp
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Department } from './types';
import { formatCurrency, getInitials } from './utils';

interface DepartmentCardProps {
  department: Department;
  onEdit?: (department: Department) => void;
  onDelete?: (department: Department) => void;
  onViewEmployees?: (department: Department) => void;
  index?: number;
  totalEmployees: number;
}

export const DepartmentCard: React.FC<DepartmentCardProps> = ({
  department,
  onEdit,
  onDelete,
  onViewEmployees,
  index = 0,
  totalEmployees,
}) => {
  const employeePercentage = totalEmployees > 0 
    ? Math.round((department.employeeCount / totalEmployees) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] shadow-sm overflow-hidden group"
    >
      {/* Color Strip */}
      <div 
        className="h-2"
        style={{ backgroundColor: department.color }}
      />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${department.color}20` }}
            >
              <span 
                className="text-lg font-bold"
                style={{ color: department.color }}
              >
                {department.code}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A]">{department.name}</h3>
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
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewEmployees?.(department)}>
                <Users className="mr-2 h-4 w-4" />
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

        {/* Description */}
        <p className="text-sm text-[#475569] mb-4 line-clamp-2">
          {department.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-md p-3">
            <div className="flex items-center gap-2 text-[#475569] text-xs mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>Employees</span>
            </div>
            <p className="text-xl font-bold text-[#0F172A]">
              {department.employeeCount}
            </p>
          </div>
          <div className="bg-white/5 rounded-md p-3">
            <div className="flex items-center gap-2 text-[#475569] text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Budget</span>
            </div>
            <p className="text-xl font-bold text-[#0F172A]">
              {formatCurrency(department.budget / 1000)}k
            </p>
          </div>
        </div>

        {/* Employee Distribution */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#475569]">Employee Distribution</span>
            <span className="font-medium text-[#0F172A]">{employeePercentage}%</span>
          </div>
          <Progress 
            value={employeePercentage} 
            className="h-2"
            style={{ 
              ['--progress-background' as string]: department.color 
            }}
          />
        </div>

        {/* Department Head */}
        {department.headId && (
          <div className="flex items-center gap-3 pt-4 border-t border-[rgba(15,23,42,0.06)]">
            <Avatar className="h-10 w-10">
              <AvatarImage src={department.headAvatar} />
              <AvatarFallback 
                className="text-sm"
                style={{ 
                  backgroundColor: `${department.color}20`,
                  color: department.color 
                }}
              >
                {department.headName ? getInitials(
                  department.headName.split(' ')[0], 
                  department.headName.split(' ')[1] || ''
                ) : 'DH'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-[#0F172A]">
                {department.headName}
              </p>
              <p className="text-xs text-[#475569]">Department Head</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};