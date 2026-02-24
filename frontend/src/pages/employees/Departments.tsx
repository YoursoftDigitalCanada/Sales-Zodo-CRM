import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Download, 
  Building2,
  Users,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  DepartmentStats,
  DepartmentCard,
  DepartmentList,
  AddDepartmentDialog,
  mockDepartments,
  mockEmployees,
  Department,
} from '@/components/employees';

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState(mockDepartments);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | undefined>();

  // Calculate stats
  const stats = useMemo(() => ({
    totalDepartments: departments.length,
    totalEmployees: departments.reduce((sum, d) => sum + d.employeeCount, 0),
    totalBudget: departments.reduce((sum, d) => sum + d.budget, 0),
    activeManagers: departments.filter(d => d.headId).length,
  }), [departments]);

  // Filter and sort departments
  const filteredDepartments = useMemo(() => {
    let result = [...departments];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (dept) =>
          dept.name.toLowerCase().includes(query) ||
          dept.code.toLowerCase().includes(query) ||
          dept.description.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'employees':
        result.sort((a, b) => b.employeeCount - a.employeeCount);
        break;
      case 'budget':
        result.sort((a, b) => b.budget - a.budget);
        break;
      case 'created':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [departments, searchQuery, sortBy]);

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setIsAddDialogOpen(true);
  };

  const handleDeleteDepartment = (department: Department) => {
    if (department.employeeCount > 0) {
      toast.error(`Cannot delete ${department.name}. It has ${department.employeeCount} employees.`);
      return;
    }
    setDepartments(departments.filter((d) => d.id !== department.id));
    toast.success(`${department.name} department has been deleted`);
  };

  const handleViewEmployees = (department: Department) => {
    // Navigate to employees page filtered by department
    toast.info(`Viewing employees in ${department.name}`);
  };

  const handleAddDepartment = (data: any) => {
    if (editingDepartment) {
      // Update existing department
      setDepartments(
        departments.map((d) =>
          d.id === editingDepartment.id
            ? {
                ...d,
                name: data.name,
                code: data.code,
                description: data.description,
                headId: data.headId || undefined,
                headName: data.headId 
                  ? mockEmployees.find((e) => e.id === data.headId)?.firstName + ' ' + 
                    mockEmployees.find((e) => e.id === data.headId)?.lastName
                  : undefined,
                budget: parseInt(data.budget),
                color: data.color,
              }
            : d
        )
      );
      toast.success(`${data.name} department has been updated`);
    } else {
      // Create new department
      const newDepartment: Department = {
        id: `dept-${Date.now()}`,
        name: data.name,
        code: data.code,
        description: data.description,
        headId: data.headId || undefined,
        headName: data.headId
          ? mockEmployees.find((e) => e.id === data.headId)?.firstName + ' ' +
            mockEmployees.find((e) => e.id === data.headId)?.lastName
          : undefined,
        employeeCount: 0,
        budget: parseInt(data.budget),
        color: data.color,
        createdAt: new Date(),
        isActive: true,
      };
      setDepartments([...departments, newDepartment]);
      toast.success(`${data.name} department has been created`);
    }
    setEditingDepartment(undefined);
  };

  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingDepartment(undefined);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Departments</h1>
          <p className="text-[#475569] mt-1">
            Manage organizational structure and departments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white "
          >
            <Plus className="w-4 h-4" />
            Add Department
          </Button>
        </div>
      </div>

      {/* Stats */}
      <DepartmentStats
        totalDepartments={stats.totalDepartments}
        totalEmployees={stats.totalEmployees}
        totalBudget={stats.totalBudget}
        activeManagers={stats.activeManagers}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="employees">Most Employees</SelectItem>
            <SelectItem value="budget">Highest Budget</SelectItem>
            <SelectItem value="created">Recently Created</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-[#0891B2] hover:bg-[#0891B2]/90' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${viewMode === 'list' ? 'bg-[#0891B2] hover:bg-[#0891B2]/90' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Department List/Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((department, index) => (
            <DepartmentCard
              key={department.id}
              department={department}
              totalEmployees={stats.totalEmployees}
              onEdit={handleEditDepartment}
              onDelete={handleDeleteDepartment}
              onViewEmployees={handleViewEmployees}
              index={index}
            />
          ))}
        </div>
      ) : (
        <DepartmentList
          departments={filteredDepartments}
          totalEmployees={stats.totalEmployees}
          onEdit={handleEditDepartment}
          onDelete={handleDeleteDepartment}
          onViewEmployees={handleViewEmployees}
          viewMode={viewMode === 'list' ? 'list' : 'table'}
        />
      )}

      {/* Empty State */}
      {filteredDepartments.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[#94A3B8]" />
          </div>
          <h3 className="text-lg font-medium text-[#0F172A] mb-1">No departments found</h3>
          <p className="text-[#475569]">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Create your first department to get started'}
          </p>
        </div>
      )}

      {/* Add/Edit Department Dialog */}
      <AddDepartmentDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        employees={mockEmployees}
        onSubmit={handleAddDepartment}
        editingDepartment={editingDepartment}
      />
    </div>
  );
};

export default DepartmentsPage;