import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  MoreVertical,
  Star,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Employee } from './types';
import { 
  getEmployeeStatusConfig, 
  getEmploymentTypeConfig, 
  getInitials,
  formatCurrency 
} from './utils';

interface EmployeeCardProps {
  employee: Employee;
  onView?: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
  index?: number;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onView,
  onEdit,
  onDelete,
  index = 0,
}) => {
  const { isMobile } = useIsMobile();
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const statusConfig = getEmployeeStatusConfig(employee.status);
  const employmentConfig = getEmploymentTypeConfig(employee.employmentType);
  const actionMenu = (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start rounded-md"
        onClick={() => {
          onView?.(employee);
          setIsActionsOpen(false);
        }}
      >
        View Profile
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start rounded-md"
        onClick={() => {
          onEdit?.(employee);
          setIsActionsOpen(false);
        }}
      >
        Edit Employee
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => {
          onDelete?.(employee);
          setIsActionsOpen(false);
        }}
      >
        Delete Employee
      </Button>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={isMobile ? undefined : { y: -4 }}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white shadow-sm"
    >
      {/* Header with gradient */}
      <div 
        className="h-20 relative"
        style={{ 
          background: `linear-gradient(135deg, #22D3EE 0%, #22D3EE/70 100%)` 
        }}
      >
        <div className="absolute top-3 right-3">
          {isMobile ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-white/30 hover:bg-white/40 text-[#0F172A]"
                onClick={() => setIsActionsOpen(true)}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              <Sheet open={isActionsOpen} onOpenChange={setIsActionsOpen}>
                <SheetContent
                  side="bottom"
                  className="rounded-t-3xl border-[rgba(15,23,42,0.06)] px-5 pb-8 pt-10"
                >
                  <SheetHeader className="mb-4 text-left">
                    <SheetTitle>
                      {employee.firstName} {employee.lastName}
                    </SheetTitle>
                    <SheetDescription>Employee actions</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-2">
                    {actionMenu}
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 bg-white/20 hover:bg-white/30 text-[#0F172A]"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(employee)}>
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(employee)}>
                  Edit Employee
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete?.(employee)}
                  className="text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="relative -mt-10 flex flex-1 flex-col px-6 pb-6">
        <div className="flex flex-col items-center">
          <Avatar className="w-20 h-20 border-4 border-white card-shadow">
            <AvatarImage src={employee.avatar} alt={`${employee.firstName} ${employee.lastName}`} />
            <AvatarFallback className="text-lg bg-[#0891B2] text-white">
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="mt-3 text-center">
            <h3 className="font-semibold text-[#0F172A]">
              {employee.firstName} {employee.lastName}
            </h3>
            <p className="text-sm text-[#475569]">{employee.position}</p>
            <p className="text-xs text-[#94A3B8] mt-1">{employee.employeeId}</p>
          </div>

          {/* Status & Type Badges */}
          <div className="flex gap-2 mt-3">
            <Badge className={`${statusConfig.color} border-0`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1.5`} />
              {statusConfig.label}
            </Badge>
            <Badge className={`${employmentConfig.color} border-0`}>
              {employmentConfig.label}
            </Badge>
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <Briefcase className="w-4 h-4 text-[#94A3B8]" />
            <span>{employee.departmentName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <Mail className="w-4 h-4 text-[#94A3B8]" />
            <span className="truncate">{employee.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <Phone className="w-4 h-4 text-[#94A3B8]" />
            <span>{employee.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <Calendar className="w-4 h-4 text-[#94A3B8]" />
            <span>Joined {format(employee.joinDate, 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Performance Rating */}
        {employee.performance.rating > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#475569]">Performance</span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-medium text-[#0F172A]">
                  {employee.performance.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Skills */}
        <div className="mt-4 flex flex-wrap gap-1">
          {employee.skills.slice(0, 3).map((skill) => (
            <span 
              key={skill}
              className="px-2 py-0.5 text-xs bg-white/5 text-[#475569] rounded-full"
            >
              {skill}
            </span>
          ))}
          {employee.skills.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-white/5 text-[#475569] rounded-full">
              +{employee.skills.length - 3}
            </span>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-auto pt-4">
        <Button 
          variant="outline" 
          className="w-full transition-colors group-hover:border-[#22D3EE] group-hover:bg-[#0891B2] group-hover:text-[#0F172A]"
          onClick={() => onView?.(employee)}
        >
          View Profile
        </Button>
        </div>
      </div>
    </motion.div>
  );
};
