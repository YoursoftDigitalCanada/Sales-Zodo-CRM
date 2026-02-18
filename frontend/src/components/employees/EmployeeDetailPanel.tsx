import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Star,
  Edit,
  Trash2,
  Download,
  FileText,
  Clock,
  DollarSign,
  User,
  Shield,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Employee } from './types';
import {
  getEmployeeStatusConfig,
  getEmploymentTypeConfig,
  getInitials,
  formatCurrency,
} from './utils';

interface EmployeeDetailPanelProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

export const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({
  employee,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!employee) return null;

  const statusConfig = getEmployeeStatusConfig(employee.status);
  const employmentConfig = getEmploymentTypeConfig(employee.employmentType);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="relative">
                <div 
                  className="h-32"
                  style={{ 
                    background: `linear-gradient(135deg, #17C3B2 0%, #0D2342 100%)` 
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white hover:bg-white/20"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </Button>

                <div className="absolute -bottom-16 left-6">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback className="text-3xl bg-[#17C3B2] text-white">
                      {getInitials(employee.firstName, employee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto pt-20 px-6 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </h2>
                    <p className="text-gray-500">{employee.position}</p>
                    <p className="text-sm text-gray-400">{employee.employeeId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => onEdit?.(employee)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onDelete?.(employee)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  <Badge className={`${statusConfig.color} border-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1.5`} />
                    {statusConfig.label}
                  </Badge>
                  <Badge className={`${employmentConfig.color} border-0`}>
                    {employmentConfig.label}
                  </Badge>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    {/* Contact Info */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Contact Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{employee.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{employee.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>
                            {employee.address.city}, {employee.address.state}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Work Info */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Work Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-[#17C3B2]" />
                            <span className="text-xs text-gray-500">Department</span>
                          </div>
                          <p className="font-medium text-gray-900">{employee.departmentName}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-[#17C3B2]" />
                            <span className="text-xs text-gray-500">Join Date</span>
                          </div>
                          <p className="font-medium text-gray-900">
                            {format(employee.joinDate, 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-[#17C3B2]" />
                            <span className="text-xs text-gray-500">Salary</span>
                          </div>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(employee.salary)}/yr
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-[#17C3B2]" />
                            <span className="text-xs text-gray-500">Manager</span>
                          </div>
                          <p className="font-medium text-gray-900">
                            {employee.managerName || 'None'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Performance */}
                    {employee.performance.rating > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                          Performance
                        </h3>
                        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-700">Overall Rating</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                              <span className="text-xl font-bold text-gray-900">
                                {employee.performance.rating.toFixed(1)}
                              </span>
                              <span className="text-gray-400">/5.0</span>
                            </div>
                          </div>
                          <Progress 
                            value={(employee.performance.rating / 5) * 100} 
                            className="h-2"
                          />
                          <div className="flex justify-between mt-3 text-sm text-gray-500">
                            <span>
                              Last review: {format(employee.performance.lastReviewDate, 'MMM d, yyyy')}
                            </span>
                            <span>
                              Next: {format(employee.performance.nextReviewDate, 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {employee.skills.map((skill) => (
                          <Badge 
                            key={skill} 
                            variant="secondary"
                            className="bg-[#17C3B2]/10 text-[#17C3B2] hover:bg-[#17C3B2]/20"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-6">
                    {/* Full Address */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Address
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700">{employee.address.street}</p>
                        <p className="text-gray-700">
                          {employee.address.city}, {employee.address.state} {employee.address.zipCode}
                        </p>
                        <p className="text-gray-700">{employee.address.country}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Emergency Contact */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Emergency Contact
                      </h3>
                      <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-gray-900">
                            {employee.emergencyContact.name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          {employee.emergencyContact.relationship}
                        </p>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{employee.emergencyContact.phone}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    {employee.documents.length > 0 ? (
                      employee.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <FileText className="w-5 h-5 text-[#17C3B2]" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{doc.name}</p>
                              <p className="text-sm text-gray-500">
                                Uploaded {format(doc.uploadedAt, 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No documents uploaded</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer Actions */}
              <div className="border-t p-4 bg-gray-50">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Mail className="w-4 h-4" />
                    Send Email
                  </Button>
                  <Button className="flex-1 gap-2 bg-[#17C3B2] hover:bg-[#17C3B2]/90">
                    <Calendar className="w-4 h-4" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};