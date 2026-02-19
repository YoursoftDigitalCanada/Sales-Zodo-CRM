 import React from 'react';
import { Search, Filter, LayoutGrid, List, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Department, EmployeeStatus, EmploymentType } from './types';

interface FilterState {
  departments: string[];
  statuses: EmployeeStatus[];
  employmentTypes: EmploymentType[];
}

interface EmployeeFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  departments: Department[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  departments,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
}) => {
  const statusOptions: { value: EmployeeStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on-leave', label: 'On Leave' },
    { value: 'probation', label: 'Probation' },
  ];

  const employmentTypeOptions: { value: EmploymentType; label: string }[] = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' },
  ];

  const activeFiltersCount = 
    filters.departments.length + 
    filters.statuses.length + 
    filters.employmentTypes.length;

  const handleDepartmentToggle = (deptId: string) => {
    const newDepartments = filters.departments.includes(deptId)
      ? filters.departments.filter(d => d !== deptId)
      : [...filters.departments, deptId];
    onFiltersChange({ ...filters, departments: newDepartments });
  };

  const handleStatusToggle = (status: EmployeeStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const handleEmploymentTypeToggle = (type: EmploymentType) => {
    const newTypes = filters.employmentTypes.includes(type)
      ? filters.employmentTypes.filter(t => t !== type)
      : [...filters.employmentTypes, type];
    onFiltersChange({ ...filters, employmentTypes: newTypes });
  };

  const clearFilters = () => {
    onFiltersChange({
      departments: [],
      statuses: [],
      employmentTypes: [],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search employees by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Sort Select */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="joinDate-desc">Newest First</SelectItem>
            <SelectItem value="joinDate-asc">Oldest First</SelectItem>
            <SelectItem value="department">Department</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 bg-[#23D3EE] hover:bg-[#23D3EE]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-8 text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <Separator />

              {/* Department Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Department</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {departments.map((dept) => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept.id}`}
                        checked={filters.departments.includes(dept.id)}
                        onCheckedChange={() => handleDepartmentToggle(dept.id)}
                      />
                      <label
                        htmlFor={`dept-${dept.id}`}
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        {dept.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Status</Label>
                <div className="space-y-2">
                  {statusOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${option.value}`}
                        checked={filters.statuses.includes(option.value)}
                        onCheckedChange={() => handleStatusToggle(option.value)}
                      />
                      <label
                        htmlFor={`status-${option.value}`}
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Employment Type Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Employment Type</Label>
                <div className="space-y-2">
                  {employmentTypeOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${option.value}`}
                        checked={filters.employmentTypes.includes(option.value)}
                        onCheckedChange={() => handleEmploymentTypeToggle(option.value)}
                      />
                      <label
                        htmlFor={`type-${option.value}`}
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-[#23D3EE] hover:bg-[#23D3EE]/90' : ''}`}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${viewMode === 'table' ? 'bg-[#23D3EE] hover:bg-[#23D3EE]/90' : ''}`}
            onClick={() => onViewModeChange('table')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.departments.map((deptId) => {
            const dept = departments.find(d => d.id === deptId);
            return dept ? (
              <Badge
                key={deptId}
                variant="secondary"
                className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                {dept.name}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleDepartmentToggle(deptId)}
                />
              </Badge>
            ) : null;
          })}
          {filters.statuses.map((status) => {
            const option = statusOptions.find(o => o.value === status);
            return option ? (
              <Badge
                key={status}
                variant="secondary"
                className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200"
              >
                {option.label}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleStatusToggle(status)}
                />
              </Badge>
            ) : null;
          })}
          {filters.employmentTypes.map((type) => {
            const option = employmentTypeOptions.find(o => o.value === type);
            return option ? (
              <Badge
                key={type}
                variant="secondary"
                className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-200"
              >
                {option.label}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => handleEmploymentTypeToggle(type)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};