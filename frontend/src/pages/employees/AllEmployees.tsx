import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Users,
  Mail,
  UserPlus,
  Filter,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  EmployeeStats,
  EmployeeCard,
  EmployeeTable,
  EmployeeFilters,
  AddEmployeeDialog,
  EmployeeDetailPanel,
  Department,
  Employee,
  EmployeeStatus,
  EmploymentType,
} from '@/components/employees';
import { getDepartments, getEmployees } from '@/features/users';
import api from '@/lib/axios';

interface FilterState {
  departments: string[];
  statuses: EmployeeStatus[];
  employmentTypes: EmploymentType[];
}

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
  department?: string | { name?: string };
  isActive?: boolean;
  employmentStatus?: string;
  status?: string;
  employmentType?: string;
  hireDate?: string;
  createdAt?: string;
  salary?: number | null;
  skills?: string[];
  managerId?: string | null;
  managerName?: string | null;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  documents?: {
    id: string;
    name?: string;
    type?: string;
    uploadedAt?: string;
  }[];
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string | null;
  };
};

type EmployeeFormPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  departmentId: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  joinDate: string;
  salary: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
  skills?: string;
  portalEmail?: string;
  portalPassword?: string;
};

const normalizeDepartmentName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const normalizeEmploymentType = (value?: string | null): EmploymentType => {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'full-time'
    || normalized === 'part-time'
    || normalized === 'contract'
    || normalized === 'intern'
  ) {
    return normalized;
  }

  return 'full-time';
};

const normalizeEmployeeStatus = (value?: string | null, isActive?: boolean): EmployeeStatus => {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'active'
    || normalized === 'inactive'
    || normalized === 'on-leave'
    || normalized === 'probation'
  ) {
    return normalized;
  }

  return isActive === false ? 'inactive' : 'active';
};

const parseSkills = (value?: string) =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const buildEmployeePayload = (data: EmployeeFormPayload, departmentName?: string) => ({
  firstName: data.firstName.trim(),
  lastName: data.lastName.trim(),
  email: data.email.trim().toLowerCase(),
  phone: data.phone.trim(),
  department: departmentName || null,
  position: data.position.trim(),
  hireDate: data.joinDate ? new Date(`${data.joinDate}T00:00:00.000Z`).toISOString() : null,
  employmentType: data.employmentType,
  employmentStatus: data.status,
  isActive: data.status !== 'inactive',
  salary: data.salary ? Number(data.salary) : null,
  skills: parseSkills(data.skills),
  address: {
    street: data.street?.trim() || '',
    city: data.city?.trim() || '',
    state: data.state?.trim() || '',
    zipCode: data.zipCode?.trim() || '',
    country: data.country?.trim() || '',
  },
  emergencyContact: {
    name: data.emergencyName?.trim() || '',
    relationship: data.emergencyRelationship?.trim() || '',
    phone: data.emergencyPhone?.trim() || '',
  },
});

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

const mapEmployeeData = (data: ApiEmployee[], departments: Department[]): Employee[] => {
  const departmentMap = new Map(
    departments.map((department) => [normalizeDepartmentName(department.name), department]),
  );

  return data.map((employee) => {
    const departmentName = typeof employee.department === 'string'
      ? employee.department
      : employee.department?.name || '';
    const matchedDepartment = departmentMap.get(normalizeDepartmentName(departmentName));

    return {
      id: employee.id,
      employeeId: employee.employeeNumber || employee.employeeId || `EMP${String(employee.id || '').slice(0, 4)}`,
      firstName: employee.user?.firstName || '',
      lastName: employee.user?.lastName || '',
      email: employee.user?.email || '',
      phone: employee.phone || '',
      avatar: employee.user?.avatar || undefined,
      position: employee.jobTitle || employee.position || '',
      departmentId: matchedDepartment?.id || employee.departmentId || '',
      departmentName,
      managerId: employee.managerId || undefined,
      managerName: employee.managerName || undefined,
      status: normalizeEmployeeStatus(employee.employmentStatus || employee.status, employee.isActive),
      employmentType: normalizeEmploymentType(employee.employmentType),
      joinDate: new Date(employee.hireDate || employee.createdAt || Date.now()),
      salary: Number(employee.salary || 0),
      skills: employee.skills || [],
      address: {
        street: employee.address?.street || '',
        city: employee.address?.city || '',
        state: employee.address?.state || '',
        zipCode: employee.address?.zipCode || '',
        country: employee.address?.country || '',
      },
      emergencyContact: {
        name: employee.emergencyContact?.name || '',
        relationship: employee.emergencyContact?.relationship || '',
        phone: employee.emergencyContact?.phone || '',
      },
      documents: (employee.documents || []).map((document) => ({
        id: document.id,
        name: document.name || 'Document',
        type: document.type || 'file',
        uploadedAt: new Date(document.uploadedAt || Date.now()),
      })),
      performance: { rating: 0, lastReviewDate: new Date(), nextReviewDate: new Date() },
    } as Employee;
  });
};

const AllEmployeesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filters, setFilters] = useState<FilterState>({
    departments: [],
    statuses: [],
    employmentTypes: [],
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const refreshData = useCallback(async (showErrorToast = true) => {
    try {
      const [departmentData, employeeData] = await Promise.all([
        getDepartments(),
        getEmployees(),
      ]);
      const mappedDepartments = mapDepartmentData(departmentData as ApiDepartment[]);
      const mappedEmployees = mapEmployeeData(employeeData as ApiEmployee[], mappedDepartments);
      setDepartments(mappedDepartments);
      setEmployees(mappedEmployees);
      return { mappedDepartments, mappedEmployees };
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      if (showErrorToast) {
        toast.error('Failed to load employees');
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await refreshData(false);
      setIsLoading(false);
    };
    load();
  }, [refreshData]);

  useEffect(() => {
    const requestedDepartment = searchParams.get('department');
    if (!requestedDepartment || departments.length === 0) {
      return;
    }

    const matchedDepartment = departments.find(
      (department) => normalizeDepartmentName(department.name) === normalizeDepartmentName(requestedDepartment),
    );
    if (!matchedDepartment) {
      return;
    }

    setFilters((current) => {
      if (
        current.departments.length === 1
        && current.departments[0] === matchedDepartment.id
      ) {
        return current;
      }

      return {
        ...current,
        departments: [matchedDepartment.id],
      };
    });
  }, [departments, searchParams]);

  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((employee) => employee.status === 'active').length,
      onLeave: employees.filter((employee) => employee.status === 'on-leave').length,
      newHires: employees.filter((employee) => new Date(employee.joinDate) >= thirtyDaysAgo).length,
    };
  }, [employees]);

  const selectedDepartmentNames = useMemo(() => new Set(
    departments
      .filter((department) => filters.departments.includes(department.id))
      .map((department) => normalizeDepartmentName(department.name)),
  ), [departments, filters.departments]);

  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (employee) =>
          `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query)
          || employee.email.toLowerCase().includes(query)
          || employee.employeeId.toLowerCase().includes(query)
          || employee.position.toLowerCase().includes(query)
          || employee.departmentName.toLowerCase().includes(query),
      );
    }

    if (filters.departments.length > 0) {
      result = result.filter((employee) => (
        filters.departments.includes(employee.departmentId)
        || selectedDepartmentNames.has(normalizeDepartmentName(employee.departmentName))
      ));
    }

    if (filters.statuses.length > 0) {
      result = result.filter((employee) => filters.statuses.includes(employee.status));
    }

    if (filters.employmentTypes.length > 0) {
      result = result.filter((employee) => filters.employmentTypes.includes(employee.employmentType));
    }

    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
        );
        break;
      case 'name-desc':
        result.sort((a, b) =>
          `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`),
        );
        break;
      case 'joinDate-desc':
        result.sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());
        break;
      case 'joinDate-asc':
        result.sort((a, b) => new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime());
        break;
      case 'department':
        result.sort((a, b) => a.departmentName.localeCompare(b.departmentName));
        break;
      default:
        break;
    }

    return result;
  }, [employees, searchQuery, filters, sortBy, selectedDepartmentNames]);

  const handleSelectAll = (selected: boolean) => {
    setSelectedIds(selected ? filteredEmployees.map((employee) => employee.id) : []);
  };

  const handleSelectOne = (id: string, selected: boolean) => {
    setSelectedIds((current) => (
      selected ? [...current, id] : current.filter((currentId) => currentId !== id)
    ));
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailPanelOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsAddDialogOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) {
      return;
    }

    try {
      await api.delete(`/employees/${employeeToDelete.id}`);
      toast.success(`${employeeToDelete.firstName} ${employeeToDelete.lastName} has been removed`);
      setEmployeeToDelete(null);
      setIsDeleteDialogOpen(false);
      if (selectedEmployee?.id === employeeToDelete.id) {
        setIsDetailPanelOpen(false);
        setSelectedEmployee(null);
      }
      await refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete employee'));
    }
  };

  const handleBulkDelete = () => {
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const idsToDelete = [...selectedIds];
    if (idsToDelete.length === 0) {
      return;
    }

    try {
      await Promise.all(idsToDelete.map((id) => api.delete(`/employees/${id}`)));
      toast.success(`${idsToDelete.length} employee${idsToDelete.length !== 1 ? 's' : ''} have been removed`);
      setSelectedIds([]);
      setIsBulkDeleteDialogOpen(false);
      if (selectedEmployee && idsToDelete.includes(selectedEmployee.id)) {
        setIsDetailPanelOpen(false);
        setSelectedEmployee(null);
      }
      await refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete employees'));
    }
  };

  const handleAddEmployee = async (data: EmployeeFormPayload) => {
    const department = departments.find((item) => item.id === data.departmentId);
    const payload = buildEmployeePayload(data, department?.name);

    if (data.portalEmail && data.portalPassword && !editingEmployee) {
      try {
        await api.post('/employees/create-portal-access', {
          email: data.portalEmail,
          password: data.portalPassword,
          phone: payload.phone,
          firstName: payload.firstName,
          lastName: payload.lastName,
          position: payload.position || 'Crew Member',
          department: payload.department,
          hireDate: payload.hireDate,
          salary: payload.salary,
          employmentStatus: payload.employmentStatus,
          employmentType: payload.employmentType,
          skills: payload.skills,
          address: payload.address,
          emergencyContact: payload.emergencyContact,
        });
        toast.success(`${data.firstName} ${data.lastName} added with Crew Portal access`);
        await refreshData();
        return;
      } catch (error) {
        toast.error(`Portal creation failed: ${getErrorMessage(error, 'Unknown error')}`);
        return;
      }
    }

    if (editingEmployee) {
      try {
        await api.put(`/employees/${editingEmployee.id}`, {
          ...payload,
        });
        toast.success(`${data.firstName} ${data.lastName}'s profile has been updated`);
        const refreshed = await refreshData();
        if (selectedEmployee?.id === editingEmployee.id) {
          const updatedEmployee = refreshed?.mappedEmployees.find((employee) => employee.id === editingEmployee.id) || null;
          setSelectedEmployee(updatedEmployee);
        }
        setEditingEmployee(undefined);
      } catch (error) {
        toast.error(`Update failed: ${getErrorMessage(error, 'Unknown error')}`);
      }
    } else {
      toast.info('To persist employees, use the Crew Portal tab to create login credentials.');
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingEmployee(undefined);
    }
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? employees.filter((employee) => selectedIds.includes(employee.id))
      : filteredEmployees;

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Position', 'Department', 'Status', 'Join Date'];
    const rows = dataToExport.map((employee) => [
      employee.employeeId,
      `${employee.firstName} ${employee.lastName}`,
      employee.email,
      employee.phone,
      employee.position,
      employee.departmentName,
      employee.status,
      new Date(employee.joinDate).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${dataToExport.length} employee${dataToExport.length !== 1 ? 's' : ''}`);
  };

  const handleBulkEmail = () => {
    const selectedEmployees = employees.filter((employee) => selectedIds.includes(employee.id));
    const emails = selectedEmployees.map((employee) => employee.email).join(',');
    window.location.href = `mailto:${emails}`;
    toast.info(`Opening email client for ${selectedIds.length} recipients`);
  };

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">All Employees</h1>
          <p className="text-[#475569] mt-1">
            Manage your team members and their information
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white "
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <EmployeeStats
        totalEmployees={stats.totalEmployees}
        activeEmployees={stats.activeEmployees}
        onLeave={stats.onLeave}
        newHires={stats.newHires}
      />

      <EmployeeFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        departments={departments}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center justify-between p-4 bg-[#0891B2]/10 rounded-md border border-[#22D3EE]/20"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0891B2]/20">
              <Users className="w-5 h-5 text-[#0891B2]" />
            </div>
            <div>
              <p className="font-medium text-[#0F172A]">
                {selectedIds.length} employee{selectedIds.length !== 1 ? 's' : ''} selected
              </p>
              <p className="text-sm text-[#475569]">
                Select actions to perform on selected employees
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
              Clear Selection
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleBulkEmail}>
              <Mail className="w-4 h-4" />
              Send Email
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button variant="destructive" size="sm" className="gap-1" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </motion.div>
      )}

      {!isLoading && filteredEmployees.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((employee, index) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onView={handleViewEmployee}
                onEdit={handleEditEmployee}
                onDelete={handleDeleteEmployee}
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmployeeTable
            employees={filteredEmployees}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onView={handleViewEmployee}
            onEdit={handleEditEmployee}
            onDelete={handleDeleteEmployee}
          />
        )
      ) : !isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-md border border-[rgba(15,23,42,0.06)]"
        >
          <div className="w-20 h-20 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-[#94A3B8]" />
          </div>
          <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
            No employees found
          </h3>
          <p className="text-[#475569] mb-6 max-w-md mx-auto">
            {searchQuery
            || filters.departments.length > 0
            || filters.statuses.length > 0
            || filters.employmentTypes.length > 0
              ? 'No employees match your current filters. Try adjusting your search criteria.'
              : 'Get started by adding your first team member to the organization.'}
          </p>
          {!searchQuery
          && filters.departments.length === 0
          && filters.statuses.length === 0
          && filters.employmentTypes.length === 0 && (
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-2 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
            >
              <UserPlus className="w-4 h-4" />
              Add Your First Employee
            </Button>
          )}
          {(searchQuery
            || filters.departments.length > 0
            || filters.statuses.length > 0
            || filters.employmentTypes.length > 0) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilters({ departments: [], statuses: [], employmentTypes: [] });
              }}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Clear All Filters
            </Button>
          )}
        </motion.div>
      ) : null}

      {!isLoading && filteredEmployees.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[#475569]">
          <p>
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
          {filters.departments.length > 0
          || filters.statuses.length > 0
          || filters.employmentTypes.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ departments: [], statuses: [], employmentTypes: [] })}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      )}

      <AddEmployeeDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        departments={departments}
        onSubmit={handleAddEmployee}
        editingEmployee={editingEmployee}
      />

      <EmployeeDetailPanel
        employee={selectedEmployee}
        isOpen={isDetailPanelOpen}
        onClose={() => {
          setIsDetailPanelOpen(false);
          setSelectedEmployee(null);
        }}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold text-[#0F172A]">
                {employeeToDelete?.firstName} {employeeToDelete?.lastName}
              </span>
              's profile and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEmployee}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} employees?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold text-[#0F172A]">
                {selectedIds.length} employee{selectedIds.length !== 1 ? 's' : ''}
              </span>{' '}
              and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedIds.length} Employee{selectedIds.length !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AllEmployeesPage;
