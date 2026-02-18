// src/components/time-tracking/TimeEntriesTable.tsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Play,
  DollarSign,
  Clock,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeEntry, Project, Task, FilterPeriod } from "./types";
import {
  formatDuration,
  formatTime,
  formatDate,
  formatCurrency,
  getProjectColor,
  isToday,
  isYesterday,
} from "./utils";

interface TimeEntriesTableProps {
  entries: TimeEntry[];
  projects: Project[];
  tasks: Task[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entryId: string) => void;
  onDuplicate: (entry: TimeEntry) => void;
  onContinue: (entry: TimeEntry) => void;
}

export function TimeEntriesTable({
  entries,
  projects,
  tasks,
  onEdit,
  onDelete,
  onDuplicate,
  onContinue,
}: TimeEntriesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("thisWeek");
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  // Group entries by date
  const groupedEntries = entries.reduce((groups, entry) => {
    let dateKey: string;
    if (isToday(entry.startTime)) {
      dateKey = "Today";
    } else if (isYesterday(entry.startTime)) {
      dateKey = "Yesterday";
    } else {
      dateKey = formatDate(entry.startTime);
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(entry);
    return groups;
  }, {} as Record<string, TimeEntry[]>);

  const getProject = (projectId: string) => projects.find((p) => p.id === projectId);
  const getTask = (taskId?: string) => tasks.find((t) => t.id === taskId);

  const toggleSelectAll = (dateEntries: TimeEntry[]) => {
    const allSelected = dateEntries.every((e) => selectedEntries.includes(e.id));
    if (allSelected) {
      setSelectedEntries((prev) => prev.filter((id) => !dateEntries.map((e) => e.id).includes(id)));
    } else {
      setSelectedEntries((prev) => [...new Set([...prev, ...dateEntries.map((e) => e.id)])]);
    }
  };

  const toggleSelect = (entryId: string) => {
    setSelectedEntries((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Time Entries</h3>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>

            {/* Period Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar size={16} />
                  <span className="capitalize">{filterPeriod.replace(/([A-Z])/g, " $1").trim()}</span>
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["today", "yesterday", "thisWeek", "lastWeek", "thisMonth"] as FilterPeriod[]).map(
                  (period) => (
                    <DropdownMenuItem
                      key={period}
                      onClick={() => setFilterPeriod(period)}
                      className="capitalize"
                    >
                      {period.replace(/([A-Z])/g, " $1").trim()}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filter Button */}
            <Button variant="outline" className="gap-2">
              <Filter size={16} />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {Object.entries(groupedEntries).map(([date, dateEntries]) => {
          const totalDuration = dateEntries.reduce((acc, e) => acc + e.duration, 0);
          const allSelected = dateEntries.every((e) => selectedEntries.includes(e.id));

          return (
            <div key={date}>
              {/* Date Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleSelectAll(dateEntries)}
                  />
                  <span className="font-medium text-gray-700">{date}</span>
                  <span className="text-sm text-gray-500">({dateEntries.length} entries)</span>
                </div>
                <span className="font-semibold text-gray-800">{formatDuration(totalDuration)}</span>
              </div>

              {/* Entries */}
              <Table>
                <TableBody>
                  <AnimatePresence>
                    {dateEntries.map((entry, index) => {
                      const project = getProject(entry.projectId);
                      const task = getTask(entry.taskId);
                      const colors = project ? getProjectColor(project.color) : null;
                      const earnings = entry.isBillable && entry.hourlyRate
                        ? (entry.duration / 3600) * entry.hourlyRate
                        : 0;

                      return (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedEntries.includes(entry.id)}
                              onCheckedChange={() => toggleSelect(entry.id)}
                            />
                          </TableCell>

                          <TableCell className="min-w-[300px]">
                            <div>
                              <p className="font-medium text-gray-800">
                                {entry.description || "No description"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {project && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                                      colors?.bg,
                                      colors?.text
                                    )}
                                  >
                                    <div
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{
                                        backgroundColor:
                                          project.color === "teal" ? "#17C3B2" : project.color,
                                      }}
                                    />
                                    {project.name}
                                  </span>
                                )}
                                {task && (
                                  <span className="text-xs text-gray-500">• {task.name}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock size={14} className="text-gray-400" />
                              {formatTime(entry.startTime)}
                              <span className="text-gray-400">-</span>
                              {entry.endTime ? formatTime(entry.endTime) : "Running"}
                            </div>
                          </TableCell>

                          <TableCell>
                            {entry.isBillable ? (
                              <div className="flex items-center gap-1 text-[#17C3B2]">
                                <DollarSign size={14} />
                                <span className="text-sm font-medium">Billable</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Non-billable</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <p className="font-semibold text-gray-800">
                              {formatDuration(entry.duration)}
                            </p>
                            {earnings > 0 && (
                              <p className="text-xs text-[#17C3B2]">{formatCurrency(earnings)}</p>
                            )}
                          </TableCell>

                          <TableCell className="w-12">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded-lg transition-all">
                                  <MoreHorizontal size={16} className="text-gray-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onContinue(entry)}>
                                  <Play size={14} className="mr-2" />
                                  Continue
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(entry)}>
                                  <Edit3 size={14} className="mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDuplicate(entry)}>
                                  <Copy size={14} className="mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDelete(entry.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {Object.keys(groupedEntries).length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No time entries found</p>
          <p className="text-sm text-gray-400 mt-1">Start tracking your time to see entries here</p>
        </div>
      )}
    </motion.div>
  );
}