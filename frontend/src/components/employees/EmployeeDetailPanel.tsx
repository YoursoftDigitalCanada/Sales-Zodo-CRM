import React, { useRef, useState } from 'react';
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
  Upload,
  Loader2,
  Video,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { ComposeEmailSheet } from '@/features/emails/components/ComposeEmailSheet';
import { createCalendarEvent } from '@/features/calendar/services/calendar-service';
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
  onRefresh?: () => Promise<void> | void;
}

export const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({
  employee,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const [isDocumentUploading, setIsDocumentUploading] = useState(false);
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingDuration, setMeetingDuration] = useState('30');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  if (!employee) return null;

  const statusConfig = getEmployeeStatusConfig(employee.status);
  const employmentConfig = getEmploymentTypeConfig(employee.employmentType);
  const employeeName = `${employee.firstName} ${employee.lastName}`.trim();

  const handleSendEmail = () => {
    if (!employee.email) {
      toast.error('This employee does not have an email address.');
      return;
    }

    setShowComposeEmail(true);
  };

  const openMeetingDialog = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMeetingDate(tomorrow.toISOString().split('T')[0]);
    setMeetingTime('10:00');
    setMeetingDuration('30');
    setMeetingType('online');
    setMeetingLocation('');
    setMeetingLink('');
    setMeetingNotes('');
    setMeetingTitle(`Meeting with ${employeeName}`);
    setShowMeetingDialog(true);
  };

  const handleScheduleMeeting = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!meetingDate || !meetingTime) {
      return;
    }

    setMeetingSubmitting(true);
    try {
      const startTime = new Date(`${meetingDate}T${meetingTime}:00`);
      const endTime = new Date(startTime.getTime() + Number(meetingDuration || 30) * 60000);

      await createCalendarEvent({
        title: meetingTitle || `Meeting with ${employeeName}`,
        description: `Meeting with employee ${employeeName}.${meetingNotes ? `\n\nNotes: ${meetingNotes}` : ''}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        eventType: 'MEETING',
        category: 'internal',
        location: meetingType === 'offline' ? meetingLocation : undefined,
        meetingLink: meetingType === 'online' ? (meetingLink || 'https://meet.google.com/new') : undefined,
        priority: 'MEDIUM',
      });

      toast.success(`Meeting scheduled with ${employeeName}.`);
      setShowMeetingDialog(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to schedule meeting.');
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsDocumentUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      await api.post(`/employees/${employee.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await onRefresh?.();
      toast.success('Employee document uploaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload employee document');
    } finally {
      setIsDocumentUploading(false);
      event.target.value = '';
    }
  };

  const handleDownloadDocument = (fileUrl?: string) => {
    if (!fileUrl) {
      toast.error('This document is missing a file link.');
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

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
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white card-shadow z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="relative">
                <div 
                  className="h-32"
                  style={{ 
                    background: `linear-gradient(135deg, #22D3EE 0%, #1a1a2e 100%)` 
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-[#0F172A] hover:bg-white/20"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </Button>

                <div className="absolute -bottom-16 left-6">
                  <Avatar className="w-32 h-32 border-4 border-white card-shadow">
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback className="text-3xl bg-[#0891B2] text-white">
                      {getInitials(employee.firstName, employee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto pt-20 px-6 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0F172A]">
                      {employee.firstName} {employee.lastName}
                    </h2>
                    <p className="text-[#475569]">{employee.position}</p>
                    <p className="text-sm text-[#94A3B8]">{employee.employeeId}</p>
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
                      <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                        Contact Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[#475569]">
                          <Mail className="w-4 h-4 text-[#94A3B8]" />
                          <span>{employee.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[#475569]">
                          <Phone className="w-4 h-4 text-[#94A3B8]" />
                          <span>{employee.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[#475569]">
                          <MapPin className="w-4 h-4 text-[#94A3B8]" />
                          <span>
                            {employee.address.city}, {employee.address.state}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Work Info */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                        Work Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-md p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-[#0891B2]" />
                            <span className="text-xs text-[#475569]">Department</span>
                          </div>
                          <p className="font-medium text-[#0F172A]">{employee.departmentName}</p>
                        </div>
                        <div className="bg-white/5 rounded-md p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-[#0891B2]" />
                            <span className="text-xs text-[#475569]">Join Date</span>
                          </div>
                          <p className="font-medium text-[#0F172A]">
                            {format(employee.joinDate, 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-md p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-[#0891B2]" />
                            <span className="text-xs text-[#475569]">Salary</span>
                          </div>
                          <p className="font-medium text-[#0F172A]">
                            {formatCurrency(employee.salary)}/yr
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-md p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-[#0891B2]" />
                            <span className="text-xs text-[#475569]">Manager</span>
                          </div>
                          <p className="font-medium text-[#0F172A]">
                            {employee.managerName || 'None'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Performance */}
                    {employee.performance.rating > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                          Performance
                        </h3>
                        <div className=" from-amber-50 to-amber-100/50 rounded-md p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-200">Overall Rating</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                              <span className="text-xl font-bold text-[#0F172A]">
                                {employee.performance.rating.toFixed(1)}
                              </span>
                              <span className="text-[#94A3B8]">/5.0</span>
                            </div>
                          </div>
                          <Progress 
                            value={(employee.performance.rating / 5) * 100} 
                            className="h-2"
                          />
                          <div className="flex justify-between mt-3 text-sm text-[#475569]">
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
                      <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {employee.skills.map((skill) => (
                          <Badge 
                            key={skill} 
                            variant="secondary"
                            className="bg-[#0891B2]/10 text-[#0891B2] hover:bg-[#0891B2]/20"
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
                      <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                        Address
                      </h3>
                      <div className="bg-white/5 rounded-md p-4">
                        <p className="text-[#0F172A]">{employee.address.street}</p>
                        <p className="text-[#0F172A]">
                          {employee.address.city}, {employee.address.state} {employee.address.zipCode}
                        </p>
                        <p className="text-[#0F172A]">{employee.address.country}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Emergency Contact */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                        Emergency Contact
                      </h3>
                      <div className="bg-red-50 rounded-md p-4 border border-red-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-[#0F172A]">
                            {employee.emergencyContact.name}
                          </span>
                        </div>
                        <p className="text-sm text-[#475569] mb-1">
                          {employee.emergencyContact.relationship}
                        </p>
                        <div className="flex items-center gap-2 text-slate-200">
                          <Phone className="w-4 h-4 text-[#94A3B8]" />
                          <span>{employee.emergencyContact.phone}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    <input
                      ref={documentInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleUploadDocument}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        disabled={isDocumentUploading}
                        onClick={() => documentInputRef.current?.click()}
                      >
                        {isDocumentUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload Document
                      </Button>
                    </div>
                    {employee.documents.length > 0 ? (
                      employee.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-md shadow-sm">
                              <FileText className="w-5 h-5 text-[#0891B2]" />
                            </div>
                            <div>
                              <p className="font-medium text-[#0F172A]">{doc.name}</p>
                              <p className="text-sm text-[#475569]">
                                Uploaded {format(doc.uploadedAt, 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc.fileUrl)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-[#475569]">No documents uploaded</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 gap-2"
                          disabled={isDocumentUploading}
                          onClick={() => documentInputRef.current?.click()}
                        >
                          {isDocumentUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Upload Document
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer Actions */}
              <div className="border-t p-4 bg-white/5">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleSendEmail}>
                    <Mail className="w-4 h-4" />
                    Send Email
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 gap-2 bg-[#0891B2] hover:bg-[#0891B2]/90"
                    onClick={openMeetingDialog}
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
          <ComposeEmailSheet
            isOpen={showComposeEmail}
            onClose={() => setShowComposeEmail(false)}
            defaultRecipientEmail={employee.email}
            defaultRecipientName={employeeName}
            defaultSubject={`Regarding ${employeeName}`}
          />
          <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
            <DialogContent className="sm:max-w-[520px] rounded-xl p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-[#0891B2] to-[#1a1a2e] p-6 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <Calendar size={22} />
                    Schedule Meeting
                  </DialogTitle>
                  <DialogDescription className="text-white/80 mt-1">
                    Schedule a meeting with <span className="font-semibold text-white">{employeeName}</span>.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form onSubmit={handleScheduleMeeting} className="p-6 space-y-5">
                <div>
                  <Label className="text-sm font-semibold text-[#0F172A] mb-3 block">Meeting Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMeetingType('online')}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${meetingType === 'online'
                        ? 'border-[#0891B2] bg-[#0891B2]/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${meetingType === 'online' ? 'bg-[#0891B2]/10' : 'bg-gray-100'}`}>
                        <Video size={24} className={meetingType === 'online' ? 'text-[#0891B2]' : 'text-gray-400'} />
                      </div>
                      <span className={`font-semibold text-sm ${meetingType === 'online' ? 'text-[#0891B2]' : 'text-gray-600'}`}>Online Meeting</span>
                      <span className="text-xs text-gray-400">Video call / Google Meet</span>
                      {meetingType === 'online' && (
                        <div className="absolute top-2 right-2">
                          <Check size={16} className="text-[#0891B2]" />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMeetingType('offline')}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${meetingType === 'offline'
                        ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${meetingType === 'offline' ? 'bg-[#F59E0B]/10' : 'bg-gray-100'}`}>
                        <MapPin size={24} className={meetingType === 'offline' ? 'text-[#F59E0B]' : 'text-gray-400'} />
                      </div>
                      <span className={`font-semibold text-sm ${meetingType === 'offline' ? 'text-[#F59E0B]' : 'text-gray-600'}`}>Offline Meeting</span>
                      <span className="text-xs text-gray-400">In-person meeting</span>
                      {meetingType === 'offline' && (
                        <div className="absolute top-2 right-2">
                          <Check size={16} className="text-[#F59E0B]" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="employeeMeetingTitle" className="text-sm font-medium text-[#475569]">Meeting Title</Label>
                  <Input
                    id="employeeMeetingTitle"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="e.g. Weekly Check-in"
                    className="mt-1.5 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="employeeMeetingDate" className="text-sm font-medium text-[#475569]">Date</Label>
                    <Input
                      id="employeeMeetingDate"
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="mt-1.5 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="employeeMeetingTime" className="text-sm font-medium text-[#475569]">Time</Label>
                    <Input
                      id="employeeMeetingTime"
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="mt-1.5 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="employeeMeetingDuration" className="text-sm font-medium text-[#475569]">Duration</Label>
                    <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                      <SelectTrigger id="employeeMeetingDuration" className="mt-1.5 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {meetingType === 'online' ? (
                  <div>
                    <Label htmlFor="employeeMeetingLink" className="text-sm font-medium text-[#475569]">Meeting Link</Label>
                    <div className="relative mt-1.5">
                      <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0891B2]" />
                      <Input
                        id="employeeMeetingLink"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="https://meet.google.com/... (auto-generated if empty)"
                        className="pl-9 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="employeeMeetingLocation" className="text-sm font-medium text-[#475569]">Location</Label>
                    <div className="relative mt-1.5">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F59E0B]" />
                      <Input
                        id="employeeMeetingLocation"
                        value={meetingLocation}
                        onChange={(e) => setMeetingLocation(e.target.value)}
                        placeholder="Meeting room / site address"
                        className="pl-9 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="employeeMeetingNotes" className="text-sm font-medium text-[#475569]">Notes (optional)</Label>
                  <Textarea
                    id="employeeMeetingNotes"
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    placeholder="Agenda, topics to discuss..."
                    rows={2}
                    className="mt-1.5 rounded-lg resize-none"
                  />
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowMeetingDialog(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={meetingSubmitting}
                    className={`rounded-lg gap-2 text-white ${meetingType === 'online'
                      ? 'bg-[#0891B2] hover:bg-[#0891B2]/90'
                      : 'bg-[#F59E0B] hover:bg-[#F59E0B]/90'
                      }`}
                  >
                    {meetingSubmitting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : meetingType === 'online' ? (
                      <Video size={16} />
                    ) : (
                      <MapPin size={16} />
                    )}
                    {meetingSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AnimatePresence>
  );
};
