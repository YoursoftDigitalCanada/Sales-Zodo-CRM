// src/components/SettingsDropdown.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  Settings2,
  Building2,
  CreditCard,
  Mail,
  Plug,
  Shield,
  User,
  LogOut,
  HelpCircle,
  Moon,
  Sun,
  Bell,
  Keyboard,
  ChevronRight,
} from "lucide-react";

interface SettingsDropdownProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  user = {
    name: "John Smith",
    email: "john@techcorp.com",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    role: "Administrator",
  },
}) => {
  const navigate = useNavigate();

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const settingsItems = [
    {
      icon: Settings2,
      label: "General Settings",
      description: "Language, timezone, notifications",
      path: "/settings?section=general",
    },
    {
      icon: Building2,
      label: "Company Profile",
      description: "Organization info and branding",
      path: "/settings?section=company",
    },
    {
      icon: CreditCard,
      label: "Billing & Plans",
      description: "Subscription and payments",
      path: "/settings?section=billing",
    },
    {
      icon: Mail,
      label: "Email Settings",
      description: "SMTP and email templates",
      path: "/settings?section=email",
    },
    {
      icon: Shield,
      label: "Security",
      description: "Password and 2FA settings",
      path: "/settings?section=security",
    },
    {
      icon: Plug,
      label: "Integrations",
      description: "WhatsApp Business and provider connections",
      path: "/settings/integrations/whatsapp",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full ring-2 ring-white shadow-sm hover:ring-[#22D3EE]/20"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 rounded-md p-2" align="end" forceMount>
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 mb-2">
          <Avatar className="h-12 w-12 border-2 border-white shadow-md">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-[#F1F5F9] text-[#0F172A] font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#0F172A] truncate">{user.name}</p>
            <p className="text-sm text-[#94A3B8] truncate">{user.email}</p>
            <p className="text-xs text-[#0891B2] font-medium">{user.role}</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 p-2">
          <button
            className="flex flex-col items-center gap-1 p-3 rounded-md hover:bg-white/5 transition-colors"
            onClick={() => navigate("/profile")}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center">
              <User size={18} className="text-blue-600" />
            </div>
            <span className="text-xs text-[#475569]">Profile</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 p-3 rounded-md hover:bg-white/5 transition-colors"
            onClick={() => navigate("/settings?section=general")}
          >
            <div className="w-10 h-10 bg-purple-100 rounded-md flex items-center justify-center">
              <Bell size={18} className="text-purple-600" />
            </div>
            <span className="text-xs text-[#475569]">Notifications</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-3 rounded-md hover:bg-white/5 transition-colors">
            <div className="w-10 h-10 bg-amber-100 rounded-md flex items-center justify-center">
              <Sun size={18} className="text-amber-600" />
            </div>
            <span className="text-xs text-[#475569]">Theme</span>
          </button>
        </div>

        <DropdownMenuSeparator />

        {/* Settings Menu */}
        <DropdownMenuLabel className="text-xs text-[#475569] font-normal px-3 py-2">
          Settings
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {settingsItems.map((item) => (
            <DropdownMenuItem
              key={item.path}
              className="rounded-md p-3 cursor-pointer"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 bg-white/5 rounded-md flex items-center justify-center">
                  <item.icon size={16} className="text-[#94A3B8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                  <p className="text-xs text-[#475569] truncate">{item.description}</p>
                </div>
                <ChevronRight size={16} className="text-[#475569]" />
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Help & Support */}
        <DropdownMenuGroup>
          <DropdownMenuItem className="rounded-md p-3 cursor-pointer">
            <HelpCircle size={16} className="mr-3 text-[#475569]" />
            <span className="text-sm">Help & Support</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-md p-3 cursor-pointer">
            <Keyboard size={16} className="mr-3 text-[#475569]" />
            <span className="text-sm">Keyboard Shortcuts</span>
            <span className="ml-auto text-xs text-[#475569] bg-white/5 px-2 py-0.5 rounded">
              ⌘K
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem className="rounded-md p-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
          <LogOut size={16} className="mr-3" />
          <span className="text-sm font-medium">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsDropdown;
