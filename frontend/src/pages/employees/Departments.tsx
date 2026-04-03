import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Download,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  DepartmentStats,
  DepartmentCard,
  DepartmentList,
  AddDepartmentDialog,
  Department,
  Employee,
} from '@/components/employees';
import {
  PullToRefreshIndicator,
  SwipeActionCard,
  usePullToRefresh,
} from '@/features/clients/components/responsive-helpers';
import { getStoredEmployee, isStoredEmployeeAdmin } from '@/features/auth/lib/auth-storage';
import {
  getDepartments as fetchDepartments,
  getEmployees,
  createDepartment as createDepartmentRequest,
  updateDepartment as updateDepartmentRequest,
  deleteDepartment as deleteDepartmentRequest,
} from '@/features/users';

type ApiDepartment = {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  headId?: string | null;
  headName?: string;
  headAvatar?: string | null;
  employeeCount?: number;
  budget?: number;
  color?: string;
  createdAt?: string;
  isActive?: boolean;
};

type ApiEmployee = {
  id: string;
  employeeNumber?: string;
  employeeId?: string;
  phone?: string;
  position?: string;
  jobTitle?: string;
  departmentId?: string;
  department?: string;
  isActive?: boolean;
  hireDate?: string;
  createdAt?: string;
  salary?: number;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string | null;
  };
};

type DepartmentFormPayload = {
  name: string;
  code: string;
  description: string;
  headId?: string;
  budget: string;
  color: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error
    && typeof error === 'object'
    && 'response' in error
  ) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const mapDepartmentData = (data: ApiDepartment[]): Department[] =>
  data.map((department) => ({
    id: department.id,
    name: department.name || '',
    code: department.code || '',
    description: department.description || '',
    headId: department.headId || undefined,
    headName: department.headName || undefined,
    headAvatar: department.headAvatar || undefined,
    employeeCount: Number(department.employeeCount || 0),
    budget: Number(department.budget || 0),
    color: department.color || '#22D3EE',
    createdAt: new Date(department.createdAt || Date.now()),
    isActive: department.isActive !== false,
  }));

const mapEmployeeData = (data: ApiEmployee[]): Employee[] =>
  data.map((employee) => ({
    id: employee.id,
    employeeId: employee.employeeNumber || employee.employeeId || `EMP${String(employee.id || '').slice(0, 4)}`,
    firstName: employee.user?.firstName || '',
    lastName: employee.user?.lastName || '',
    email: employee.user?.email || '',
    phone: employee.phone || '',
    avatar: employee.user?.avatar || undefined,
    position: employee.position || employee.jobTitle || '',
    departmentId: employee.departmentId || '',
    departmentName: employee.department || '',
    status: employee.isActive === false ? 'inactive' : 'active',
    employmentType: 'full-time',
    joinDate: new Date(employee.hireDate || employee.createdAt || Date.now()),
    salary: Number(employee.salary || 0),
    skills: [],
    address: { street: '', city: '', state: '', zipCode: '', country: '' },
    emergencyContact: { name: '', relationship: '', phone: '' },
    documents: [],
    performance: { rating: 0, lastReviewDate: new Date(), nextReviewDate: new Date() },
  }));

const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const isAdminUser = isStoredEmployeeAdmin(getStoredEmployee());
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | undefined>();
  const effectiveViewMode = isMobile ? 'grid' : viewMode;

  useEffect(() => {
    if (!isAdminUser) {
      navigate('/employees/attendance', { replace: true });
    }
  }, [isAdminUser, navigate]);

  const refreshData = useCallback(async (showErrorToast = true) => {
    if (!isAdminUser) {
      return;
    }

    try {
      const [departmentData, employeeData] = await Promise.all([
        fetchDepartments(),
        getEmployees(),
      ]);
      setDepartments(mapDepartmentData(departmentData as ApiDepartment[]));
      setEmployees(mapEmployeeData(employeeData as ApiEmployee[]));
    } catch (error) {
      console.error('Failed to fetch departments data:', error);
      if (showErrorToast) {
        toast.error('Failed to load departments');
      }
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (!isAdminUser) {
      return;
    }

    const load = async () => {
      setIsLoading(true);
      await refreshData(false);
      setIsLoading(false);
    };
    load();
  }, [isAdminUser, refreshData]);

  const stats = useMemo(() => ({
    totalDepartments: departments.length,
    totalEmployees: departments.reduce((sum, department) => sum + department.employeeCount, 0),
    totalBudget: departments.reduce((sum, department) => sum + department.budget, 0),
    activeManagers: departments.filter((department) => department.headId).length,
  }), [departments]);

  const filteredDepartments = useMemo(() => {
    let result = [...departments];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (department) =>
          department.name.toLowerCase().includes(query)
          || department.code.toLowerCase().includes(query)
          || department.description.toLowerCase().includes(query),
      );
    }

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
      default:
        break;
    }

    return result;
  }, [departments, searchQuery, sortBy]);

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setIsAddDialogOpen(true);
  };

  const handleDeleteDepartment = async (department: Department) => {
    if (department.employeeCount > 0) {
      toast.error(`Cannot delete ${department.name}. It has ${department.employeeCount} employees.`);
      return;
    }

    try {
      await deleteDepartmentRequest(department.id);
      setDepartments((current) => current.filter((item) => item.id !== department.id));
      toast.success(`${department.name} department has been deleted`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete department'));
    }
  };

  const handleViewEmployees = (department: Department) => {
    navigate(`/employees?department=${encodeURIComponent(department.name)}`);
  };

  const { handlers: pullHandlers, pullDistance, isRefreshing } = usePullToRefresh({
    enabled: isMobile && !isLoading,
    onRefresh: async () => {
      await refreshData(false);
    },
  });

  const handleAddDepartment = async (data: DepartmentFormPayload) => {
    const payload = {
      ...data,
      budget: Number(data.budget),
      headId: data.headId || null,
    };

    try {
      if (editingDepartment) {
        await updateDepartmentRequest(editingDepartment.id, payload);
        toast.success(`${payload.name} department has been updated`);
      } else {
        await createDepartmentRequest(payload);
        toast.success(`${payload.name} department has been created`);
      }

      setEditingDepartment(undefined);
      await refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save department'));
      throw error;
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingDepartment(undefined);
    }
  };

  const handleExport = () => {
    const headers = ['Code', 'Department', 'Description', 'Employees', 'Budget', 'Head', 'Status'];
    const rows = filteredDepartments.map((department) => [
      department.code,
      department.name,
      department.description,
      String(department.employeeCount),
      String(department.budget),
      department.headName || '',
      department.isActive ? 'Active' : 'Inactive',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `departments-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredDepartments.length} department${filteredDepartments.length === 1 ? '' : 's'}`);
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#F8FAFC] p-4 sm:p-6" {...pullHandlers}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Departments</h1>
          <p className="text-[#475569] mt-1">
            Manage organizational structure and departments
          </p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
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

      <DepartmentStats
        totalDepartments={stats.totalDepartments}
        totalEmployees={stats.totalEmployees}
        totalBudget={stats.totalBudget}
        activeManagers={stats.activeManagers}
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <Input
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full bg-white sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="employees">Most Employees</SelectItem>
            <SelectItem value="budget">Highest Budget</SelectItem>
            <SelectItem value="created">Recently Created</SelectItem>
          </SelectContent>
        </Select>

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

      {!isLoading && effectiveViewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {filteredDepartments.map((department, index) => (
            isMobile ? (
              <SwipeActionCard
                key={department.id}
                onView={() => handleViewEmployees(department)}
                onDelete={() => handleDeleteDepartment(department)}
                primaryLabel="View Team"
                secondaryLabel="Delete"
              >
                <DepartmentCard
                  department={department}
                  totalEmployees={stats.totalEmployees}
                  onEdit={handleEditDepartment}
                  onDelete={handleDeleteDepartment}
                  onViewEmployees={handleViewEmployees}
                  index={index}
                />
              </SwipeActionCard>
            ) : (
              <DepartmentCard
                key={department.id}
                department={department}
                totalEmployees={stats.totalEmployees}
                onEdit={handleEditDepartment}
                onDelete={handleDeleteDepartment}
                onViewEmployees={handleViewEmployees}
                index={index}
              />
            )
          ))}
        </div>
      ) : !isLoading ? (
        <DepartmentList
          departments={filteredDepartments}
          totalEmployees={stats.totalEmployees}
          onEdit={handleEditDepartment}
          onDelete={handleDeleteDepartment}
          onViewEmployees={handleViewEmployees}
          viewMode={effectiveViewMode === 'list' ? 'list' : 'table'}
        />
      ) : null}

      {!isLoading && filteredDepartments.length === 0 && (
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

      <AddDepartmentDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        employees={employees}
        onSubmit={handleAddDepartment}
        editingDepartment={editingDepartment}
      />

      {isMobile && (
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          size="icon"
          className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full bg-[#0891B2] text-white shadow-lg hover:bg-[#0891B2]/90 sm:hidden"
          aria-label="Add Department"
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default DepartmentsPage;
