// src/components/chat/NewChatDialog.tsx

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "./types";
import { StatusBadge } from "./StatusBadge";
import { getInitials } from "./utils";
import { cn } from "@/lib/utils";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  initialTab?: "direct" | "group";
  onCreateDirectChat: (user: User) => void;
  onCreateGroupChat: (name: string, users: User[]) => void;
}

export function NewChatDialog({
  open,
  onOpenChange,
  users,
  initialTab = "direct",
  onCreateDirectChat,
  onCreateGroupChat,
}: NewChatDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"direct" | "group">(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setSearchQuery("");
      setGroupName("");
      setSelectedUsers([]);
    }
  }, [initialTab, open]);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (user: User) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      onCreateGroupChat(groupName.trim(), selectedUsers);
      setGroupName("");
      setSelectedUsers([]);
      onOpenChange(false);
    }
  };

  const handleSelectUser = (user: User) => {
    onCreateDirectChat(user);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Start a direct message with a teammate or create a group chat for your company.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "direct" | "group")} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Direct Message</TabsTrigger>
            <TabsTrigger value="group">Group Chat</TabsTrigger>
          </TabsList>

          {/* Direct Message Tab */}
          <TabsContent value="direct" className="mt-4">
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-[#475569]">No contacts found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <motion.button
                      key={user.id}
                      whileHover={{ x: 4 }}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white/5 transition-all"
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10 rounded-md">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] rounded-md">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <StatusBadge status={user.status} size="sm" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-[#0F172A]">{user.name}</p>
                        <p className="text-sm text-[#475569]">{user.email}</p>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Group Chat Tab */}
          <TabsContent value="group" className="mt-4">
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />

              {/* Selected Users Preview */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-md">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-1 px-2 py-1 bg-[#0891B2]/10 text-[#0891B2] rounded-full text-sm"
                    >
                      <span>{user.name.split(" ")[0]}</span>
                      <button
                        onClick={() => toggleUserSelection(user)}
                        className="w-4 h-4 flex items-center justify-center hover:bg-[#0891B2]/20 rounded-full"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  type="text"
                  placeholder="Add participants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some((u) => u.id === user.id);
                    return (
                      <motion.button
                        key={user.id}
                        whileHover={{ x: 4 }}
                        onClick={() => toggleUserSelection(user)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-md transition-all",
                          isSelected ? "bg-[#0891B2]/10" : "hover:bg-white/5"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="w-8 h-8 rounded-md">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] text-xs rounded-md">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="flex-1 text-left text-sm font-medium text-[#0F172A]">
                          {user.name}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 bg-[#0891B2] rounded-full flex items-center justify-center">
                            <Check size={12} className="text-[#0F172A]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </ScrollArea>

              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
                className="w-full bg-[#0891B2] hover:bg-[#0891B2]/90 disabled:opacity-50"
              >
                Create Group ({selectedUsers.length} selected)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
