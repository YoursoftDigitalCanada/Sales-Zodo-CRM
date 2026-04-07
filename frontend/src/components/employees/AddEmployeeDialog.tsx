import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  MapPin,
  DollarSign,
  Upload,
  Lock,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AddressAutocompleteInput from '@/components/address/AddressAutocompleteInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Department, Employee, EmploymentType, EmployeeStatus } from './types';
import {
  CANADIAN_PHONE_VALIDATION_MESSAGE,
  CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE,
  EMAIL_VALIDATION_MESSAGE,
  PERSON_NAME_VALIDATION_MESSAGE,
  isValidCanadianPhoneNumber,
  isValidCanadianPostalCode,
  isValidEmailAddress,
  isValidPersonName,
} from '@contracts/contact';

const employeeFormSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').refine(isValidPersonName, `First name ${PERSON_NAME_VALIDATION_MESSAGE}`),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').refine(isValidPersonName, `Last name ${PERSON_NAME_VALIDATION_MESSAGE}`),
  email: z.string().trim().refine(isValidEmailAddress, EMAIL_VALIDATION_MESSAGE),
  phone: z.string().trim().refine(isValidCanadianPhoneNumber, CANADIAN_PHONE_VALIDATION_MESSAGE),
  position: z.string().min(2, 'Position is required'),
  departmentId: z.string().min(1, 'Department is required'),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'intern']),
  status: z.enum(['active', 'inactive', 'on-leave', 'probation']),
  joinDate: z.string().min(1, 'Join date is required'),
  salary: z.string().min(1, 'Salary is required'),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional().refine((value) => !value || isValidCanadianPostalCode(value), CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE),
  country: z.string().optional(),
  emergencyName: z.string().optional().refine((value) => !value || isValidPersonName(value), `Emergency contact name ${PERSON_NAME_VALIDATION_MESSAGE}`),
  emergencyRelationship: z.string().optional(),
  emergencyPhone: z.string().optional().refine((value) => !value || isValidCanadianPhoneNumber(value), CANADIAN_PHONE_VALIDATION_MESSAGE),
  skills: z.string().optional(),
  portalEmail: z.string().optional().refine(
    (val) => !val || isValidEmailAddress(val),
    { message: EMAIL_VALIDATION_MESSAGE }
  ).refine(
    (val) => !val || val.endsWith('@zodo.ca'),
    { message: 'Portal email must end with @zodo.ca' }
  ),
  portalPassword: z.string().optional().refine(
    (val) => !val || val.length >= 8,
    { message: 'Password must be at least 8 characters' }
  ),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
type EditableEmployee = Employee & { portalEmail?: string };
type EmployeeFormStep = 'basic' | 'employment' | 'address' | 'emergency' | 'portal';

const EMPLOYEE_FORM_STEPS: EmployeeFormStep[] = ['basic', 'employment', 'address', 'emergency', 'portal'];
const EDIT_EMPLOYEE_FORM_STEPS: EmployeeFormStep[] = ['basic', 'employment', 'address', 'emergency'];

const STEP_FIELDS: Record<EmployeeFormStep, Array<keyof EmployeeFormValues>> = {
  basic: ['firstName', 'lastName', 'email', 'phone'],
  employment: ['position', 'departmentId', 'employmentType', 'status', 'joinDate', 'salary'],
  address: ['street', 'city', 'state', 'zipCode', 'country'],
  emergency: ['emergencyName', 'emergencyRelationship', 'emergencyPhone'],
  portal: ['portalEmail', 'portalPassword'],
};

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onSubmit: (data: EmployeeFormValues) => boolean | Promise<boolean>;
  editingEmployee?: EditableEmployee;
}

export const AddEmployeeDialog: React.FC<AddEmployeeDialogProps> = ({
  open,
  onOpenChange,
  departments,
  onSubmit,
  editingEmployee,
}) => {
  const { isMobile } = useIsMobile();
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [activeStep, setActiveStep] = useState<EmployeeFormStep>('basic');
  const formSteps = editingEmployee ? EDIT_EMPLOYEE_FORM_STEPS : EMPLOYEE_FORM_STEPS;
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: editingEmployee?.firstName || '',
      lastName: editingEmployee?.lastName || '',
      email: editingEmployee?.email || '',
      phone: editingEmployee?.phone || '',
      position: editingEmployee?.position || '',
      departmentId: editingEmployee?.departmentId || '',
      employmentType: editingEmployee?.employmentType || 'full-time',
      status: editingEmployee?.status || 'active',
      joinDate: editingEmployee?.joinDate
        ? new Date(editingEmployee.joinDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      salary: editingEmployee?.salary?.toString() || '',
      street: editingEmployee?.address?.street || '',
      city: editingEmployee?.address?.city || '',
      state: editingEmployee?.address?.state || '',
      zipCode: editingEmployee?.address?.zipCode || '',
      country: editingEmployee?.address?.country || 'Canada',
      emergencyName: editingEmployee?.emergencyContact?.name || '',
      emergencyRelationship: editingEmployee?.emergencyContact?.relationship || '',
      emergencyPhone: editingEmployee?.emergencyContact?.phone || '',
      skills: editingEmployee?.skills?.join(', ') || '',
      portalEmail: editingEmployee?.portalEmail || '',
      portalPassword: '',
    },
  });

  useEffect(() => {
    form.reset({
      firstName: editingEmployee?.firstName || '',
      lastName: editingEmployee?.lastName || '',
      email: editingEmployee?.email || '',
      phone: editingEmployee?.phone || '',
      position: editingEmployee?.position || '',
      departmentId: editingEmployee?.departmentId || '',
      employmentType: editingEmployee?.employmentType || 'full-time',
      status: editingEmployee?.status || 'active',
      joinDate: editingEmployee?.joinDate
        ? new Date(editingEmployee.joinDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      salary: editingEmployee?.salary?.toString() || '',
      street: editingEmployee?.address?.street || '',
      city: editingEmployee?.address?.city || '',
      state: editingEmployee?.address?.state || '',
      zipCode: editingEmployee?.address?.zipCode || '',
      country: editingEmployee?.address?.country || 'Canada',
      emergencyName: editingEmployee?.emergencyContact?.name || '',
      emergencyRelationship: editingEmployee?.emergencyContact?.relationship || '',
      emergencyPhone: editingEmployee?.emergencyContact?.phone || '',
      skills: editingEmployee?.skills?.join(', ') || '',
      portalEmail: editingEmployee?.portalEmail || '',
      portalPassword: '',
    });
    setActiveStep('basic');
  }, [editingEmployee, form, open]);

  const handleSubmit = async (data: EmployeeFormValues) => {
    if (!editingEmployee) {
      let hasPortalErrors = false;

      if (!data.portalEmail?.trim()) {
        form.setError('portalEmail', {
          type: 'manual',
          message: 'Portal email is required to create a new employee.',
        });
        hasPortalErrors = true;
      }

      if (!data.portalPassword?.trim()) {
        form.setError('portalPassword', {
          type: 'manual',
          message: 'Portal password is required to create a new employee.',
        });
        hasPortalErrors = true;
      }

      if (hasPortalErrors) {
        setActiveStep('portal');
        return;
      }
    }

    const didSave = await onSubmit(data);
    if (!didSave) {
      return;
    }

    form.reset();
    setActiveStep('basic');
    onOpenChange(false);
  };

  const currentStepIndex = formSteps.indexOf(activeStep);
  const isLastStep = currentStepIndex === formSteps.length - 1;

  const validateStep = async (step: EmployeeFormStep) => form.trigger(STEP_FIELDS[step]);

  const goToStep = async (nextStep: EmployeeFormStep) => {
    if (nextStep === activeStep) {
      return;
    }

    const nextIndex = EMPLOYEE_FORM_STEPS.indexOf(nextStep);
    const currentIndex = EMPLOYEE_FORM_STEPS.indexOf(activeStep);

    if (nextIndex <= currentIndex) {
      setActiveStep(nextStep);
      return;
    }

    const isCurrentStepValid = await validateStep(activeStep);
    if (!isCurrentStepValid) {
      return;
    }

    setActiveStep(nextStep);
  };

  const handleNextStep = async () => {
    const isCurrentStepValid = await validateStep(activeStep);
    if (!isCurrentStepValid || isLastStep) {
      return;
    }

    setActiveStep(formSteps[currentStepIndex + 1]);
  };

  const handlePreviousStep = () => {
    if (currentStepIndex <= 0) {
      return;
    }

    setActiveStep(formSteps[currentStepIndex - 1]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isMobile
            ? "left-0 top-auto bottom-0 max-h-[92vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl px-4 pb-8 pt-6"
            : "max-h-[90vh] max-w-2xl overflow-y-auto"
        }
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#0F172A]">
            {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeStep} onValueChange={(value) => { void goToStep(value as EmployeeFormStep); }} className="w-full">
              <TabsList className={`grid w-full ${editingEmployee ? 'grid-cols-4' : 'grid-cols-5'}`}>
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
                {!editingEmployee ? <TabsTrigger value="portal">Crew Portal</TabsTrigger> : null}
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Avatar Upload */}
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-[rgba(15,23,42,0.06)]">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-[#0891B2]/10 text-[#0891B2] text-2xl">
                        <User className="w-10 h-10" />
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                            <Input {...field} className="pl-10" placeholder="Mike" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Thompson" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                          <Input {...field} className="pl-10" placeholder="mike.foreman@roofingteam.ca" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                          <Input {...field} className="pl-10" placeholder="+1 (555) 123-4567" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills (comma separated)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Roof inspections, shingle installation, flashing repair, ladder safety..."
                          className="resize-none"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="employment" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                          <Input {...field} className="pl-10" placeholder="Roofing Crew Lead" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <Building2 className="w-4 h-4 text-[#94A3B8] mr-2" />
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full-time">Full Time</SelectItem>
                            <SelectItem value="part-time">Part Time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="probation">Probation</SelectItem>
                            <SelectItem value="on-leave">On Leave</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Join Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                            <Input {...field} type="date" className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Salary</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                            <Input {...field} type="number" className="pl-10" placeholder="75000" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <AddressAutocompleteInput
                          name={field.name}
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="123 Main Street"
                          className="h-10"
                          onSelectAddress={(details) => {
                            form.setValue('street', details.addressLine1 || details.formattedAddress || field.value || '', { shouldDirty: true });
                            form.setValue('city', details.city || '', { shouldDirty: true });
                            form.setValue('state', details.state || '', { shouldDirty: true });
                            form.setValue('zipCode', details.postalCode || '', { shouldDirty: true });
                            form.setValue('country', details.country || form.getValues('country') || 'USA', { shouldDirty: true });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="San Francisco" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="CA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="94105" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="USA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="space-y-4 mt-4">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    Emergency contact information is important for workplace safety.
                    Please provide accurate details.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="emergencyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Jane Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Spouse, Parent, Sibling..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                          <Input {...field} className="pl-10" placeholder="+1 (555) 987-6543" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {!editingEmployee ? (
                <TabsContent value="portal" className="space-y-4 mt-4">
                  <div className="bg-cyan-50 border border-cyan-200 rounded-md p-4 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-cyan-700" />
                      <p className="text-sm font-semibold text-cyan-800">Crew Portal Access</p>
                    </div>
                    <p className="text-sm text-cyan-700">
                      Create login credentials for the employee to access the Crew Portal at{' '}
                      <strong>crew.zodo.ca</strong>. New employees need portal credentials at creation time.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="portalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portal Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                            <Input
                              {...field}
                              className="pl-10"
                              placeholder="firstname.lastname@zodo.ca"
                              onChange={(e) => {
                                const val = e.target.value;
                                form.clearErrors('portalEmail');
                                field.onChange(val);
                              }}
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Must end with @zodo.ca</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="portalPassword"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portal Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                              <Input
                                {...field}
                                type={showPortalPassword ? 'text' : 'password'}
                                className="pl-10 pr-10"
                                placeholder="Min 8 characters"
                                onChange={(e) => {
                                  form.clearErrors('portalPassword');
                                  field.onChange(e.target.value);
                                }}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                                onClick={() => setShowPortalPassword((current) => !current)}
                              >
                                {showPortalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Min 8 chars, must include uppercase, lowercase, number, and special character (!@#$%...)</p>
                          <FormMessage />
                        </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <p className="text-xs text-blue-700">
                      <strong>Tip:</strong> Use the format <code>firstname.lastname@zodo.ca</code> for consistency.
                      The employee will use these credentials to log into the Crew Portal to view assigned jobs,
                      track time, submit checklists, and more.
                    </p>
                  </div>
                </TabsContent>
              ) : null}
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {currentStepIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  Previous
                </Button>
              )}
              {isLastStep ? (
                <Button
                  type="submit"
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
                >
                  {editingEmployee ? 'Update Employee' : 'Add Employee'}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white"
                  onClick={() => { void handleNextStep(); }}
                >
                  Next
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
