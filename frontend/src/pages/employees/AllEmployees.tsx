import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Users,
  Mail,
  UserPlus,
  Filter
} from 'lucide-react';
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
  mockEmployees,
  mockDepartments,
  Employee,
  EmployeeStatus,
  EmploymentType,
} from '@/components/employees';
import { getEmployees } from "@/features/users";
import api from "@/lib/axios";

interface FilterState {
  departments: string[];
  statuses: EmployeeStatus[];
  employmentTypes: EmploymentType[];
}

const AllEmployeesPage: React.FC = () => {
  // State
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
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

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Fetch employees from API on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployees() as any[] || [];
        if (data.length > 0) {
          const mapped: Employee[] = data.map((e: any) => ({
            id: e.id,
            employeeId: e.employeeId || `EMP${e.id?.slice(0, 3)}`,
            firstName: e.user?.firstName || '',
            lastName: e.user?.lastName || '',
            email: e.user?.email || '',
            phone: e.phone || '',
            position: e.jobTitle || e.position || '',
            departmentId: e.departmentId || '',
            departmentName: e.department?.name || '',
            status: e.status?.toLowerCase() || 'active',
            employmentType: e.employmentType?.toLowerCase().replace('_', '-') || 'full-time',
            joinDate: new Date(e.hireDate || e.createdAt),
            salary: e.salary || 0,
            skills: [],
            address: { street: '', city: '', state: '', zipCode: '', country: '' },
            emergencyContact: { name: '', relationship: '', phone: '' },
            documents: [],
            performance: { rating: 0, lastReviewDate: new Date(), nextReviewDate: new Date() },
          }));
          setEmployees(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        toast.info('Using sample data. Login to see your employees.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.status === 'active').length,
      onLeave: employees.filter((e) => e.status === 'on-leave').length,
      newHires: employees.filter((e) => new Date(e.joinDate) >= thirtyDaysAgo).length,
    };
  }, [employees]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (emp) =>
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.employeeId.toLowerCase().includes(query) ||
          emp.position.toLowerCase().includes(query) ||
          emp.departmentName.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (filters.departments.length > 0) {
      result = result.filter((emp) => filters.departments.includes(emp.departmentId));
    }

    // Status filter
    if (filters.statuses.length > 0) {
      result = result.filter((emp) => filters.statuses.includes(emp.status));
    }

    // Employment type filter
    if (filters.employmentTypes.length > 0) {
      result = result.filter((emp) => filters.employmentTypes.includes(emp.employmentType));
    }

    // Sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );
        break;
      case 'name-desc':
        result.sort((a, b) =>
          `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`)
        );
        break;
      case 'joinDate-desc':
        result.sort(
          (a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
        );
        break;
      case 'joinDate-asc':
        result.sort(
          (a, b) => new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime()
        );
        break;
      case 'department':
        result.sort((a, b) => a.departmentName.localeCompare(b.departmentName));
        break;
    }

    return result;
  }, [employees, searchQuery, filters, sortBy]);

  // Selection handlers
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(filteredEmployees.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  // View employee details
  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailPanelOpen(true);
  };

  // Edit employee
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsAddDialogOpen(true);
  };

  // Delete employee
  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete) {
      setEmployees(employees.filter((e) => e.id !== employeeToDelete.id));
      toast.success(`${employeeToDelete.firstName} ${employeeToDelete.lastName} has been removed`);
      setEmployeeToDelete(null);
      setIsDeleteDialogOpen(false);

      // Close detail panel if viewing deleted employee
      if (selectedEmployee?.id === employeeToDelete.id) {
        setIsDetailPanelOpen(false);
        setSelectedEmployee(null);
      }
    }
  };

  // Bulk delete
  const handleBulkDelete = () => {
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    const count = selectedIds.length;
    setEmployees(employees.filter((e) => !selectedIds.includes(e.id)));
    toast.success(`${count} employee${count !== 1 ? 's' : ''} have been removed`);
    setSelectedIds([]);
    setIsBulkDeleteDialogOpen(false);

    // Close detail panel if viewing deleted employee
    if (selectedEmployee && selectedIds.includes(selectedEmployee.id)) {
      setIsDetailPanelOpen(false);
      setSelectedEmployee(null);
    }
  };

  // Add/Edit employee submission
  const handleAddEmployee = async (data: any) => {
    const department = mockDepartments.find((d) => d.id === data.departmentId);

    // If portal credentials are provided, create crew portal access within this tenant
    if (data.portalEmail && data.portalPassword && !editingEmployee) {
      try {
        await api.post('/employees/create-portal-access', {
          email: data.portalEmail,
          password: data.portalPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          position: data.position || 'Crew Member',
          department: department?.name,
        });
        toast.success(`Crew Portal access created for ${data.portalEmail}`);
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Unknown error';
        toast.error(`Portal creation failed: ${msg}`);
      }
    }

    if (editingEmployee) {
      // Update existing employee
      setEmployees(
        employees.map((emp) =>
          emp.id === editingEmployee.id
            ? {
              ...emp,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              position: data.position,
              departmentId: data.departmentId,
              departmentName: department?.name || '',
              status: data.status,
              employmentType: data.employmentType,
              joinDate: new Date(data.joinDate),
              salary: parseInt(data.salary),
              skills: data.skills
                ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [],
              address: {
                street: data.street || '',
                city: data.city || '',
                state: data.state || '',
                zipCode: data.zipCode || '',
                country: data.country || 'USA',
              },
              emergencyContact: {
                name: data.emergencyName || '',
                relationship: data.emergencyRelationship || '',
                phone: data.emergencyPhone || '',
              },
            }
            : emp
        )
      );
      toast.success(`${data.firstName} ${data.lastName}'s profile has been updated`);
      setEditingEmployee(undefined);
    } else {
      // Create new employee
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        employeeId: `EMP${String(employees.length + 1).padStart(3, '0')}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        position: data.position,
        departmentId: data.departmentId,
        departmentName: department?.name || '',
        status: data.status,
        employmentType: data.employmentType,
        joinDate: new Date(data.joinDate),
        salary: parseInt(data.salary),
        skills: data.skills
          ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        address: {
          street: data.street || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          country: data.country || 'USA',
        },
        emergencyContact: {
          name: data.emergencyName || '',
          relationship: data.emergencyRelationship || '',
          phone: data.emergencyPhone || '',
        },
        documents: [],
        performance: {
          rating: 0,
          lastReviewDate: new Date(),
          nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      };

      setEmployees([newEmployee, ...employees]);
      toast.success(`${data.firstName} ${data.lastName} has been added to the team`);
    }
  };

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingEmployee(undefined);
    }
  };

  // Export employees
  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? employees.filter(e => selectedIds.includes(e.id))
      : filteredEmployees;

    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Position', 'Department', 'Status', 'Join Date'];
    const rows = dataToExport.map(emp => [
      emp.employeeId,
      `${emp.firstName} ${emp.lastName}`,
      emp.email,
      emp.phone,
      emp.position,
      emp.departmentName,
      emp.status,
      new Date(emp.joinDate).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${dataToExport.length} employee${dataToExport.length !== 1 ? 's' : ''}`);
  };

  // Send bulk email
  const handleBulkEmail = () => {
    const selectedEmployees = employees.filter(e => selectedIds.includes(e.id));
    const emails = selectedEmployees.map(e => e.email).join(',');
    window.location.href = `mailto:${emails}`;
    toast.info(`Opening email client for ${selectedIds.length} recipients`);
  };

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
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

      {/* Stats */}
      <EmployeeStats
        totalEmployees={stats.totalEmployees}
        activeEmployees={stats.activeEmployees}
        onLeave={stats.onLeave}
        newHires={stats.newHires}
      />

      {/* Filters */}
      <EmployeeFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        departments={mockDepartments}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Bulk Actions */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={handleBulkEmail}
            >
              <Mail className="w-4 h-4" />
              Send Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={handleExport}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </motion.div>
      )}

      {/* Employee List */}
      {filteredEmployees.length > 0 ? (
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
      ) : (
        // Empty State
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
            {searchQuery ||
              filters.departments.length > 0 ||
              filters.statuses.length > 0 ||
              filters.employmentTypes.length > 0
              ? "No employees match your current filters. Try adjusting your search criteria."
              : "Get started by adding your first team member to the organization."}
          </p>
          {!searchQuery &&
            filters.departments.length === 0 &&
            filters.statuses.length === 0 &&
            filters.employmentTypes.length === 0 && (
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="gap-2 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
              >
                <UserPlus className="w-4 h-4" />
                Add Your First Employee
              </Button>
            )}
          {(searchQuery ||
            filters.departments.length > 0 ||
            filters.statuses.length > 0 ||
            filters.employmentTypes.length > 0) && (
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
      )}

      {/* Pagination Info */}
      {filteredEmployees.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[#475569]">
          <p>
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
          {filters.departments.length > 0 ||
            filters.statuses.length > 0 ||
            filters.employmentTypes.length > 0 ? (
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

      {/* Add/Edit Employee Dialog */}
      <AddEmployeeDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        departments={mockDepartments}
        onSubmit={handleAddEmployee}
        editingEmployee={editingEmployee}
      />

      {/* Employee Detail Panel */}
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

      {/* Delete Confirmation Dialog */}
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

      {/* Bulk Delete Confirmation Dialog */}
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
