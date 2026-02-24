// src/pages/Ecommerce.tsx

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Bell,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  MoreVertical,
  MoreHorizontal,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Star,
  StarOff,
  Heart,
  ShoppingCart,
  ShoppingBag,
  Package,
  PackageCheck,
  PackageX,
  Truck,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Users,
  UserPlus,
  Receipt,
  Tag,
  Tags,
  Percent,
  Gift,
  Box,
  Boxes,
  ArchiveX,
  RefreshCw,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
  Image as ImageIcon,
  FileText,
  Layers,
  Grid3X3,
  BarChart2,
  CircleDollarSign,
  Wallet,
  BadgePercent,
  Store,
  type LucideIcon,
} from "lucide-react";
import {
  getProducts as fetchProductsApi,
  getOrders as fetchOrdersApi,
  createProduct as createProductApi,
  updateOrder as updateOrderApi,
} from "@/features/ecommerce";

// ============================================
// TYPES
// ============================================

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  comparePrice?: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  status: "active" | "draft" | "archived";
  images: string[];
  variants?: ProductVariant[];
  tags: string[];
  sales: number;
  revenue: number;
  rating: number;
  reviews: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: { [key: string]: string };
}

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: string;
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  variant?: string;
  quantity: number;
  price: number;
  total: number;
}

interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
  parentId?: string;
}

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  minPurchase?: number;
  maxUses?: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "disabled";
}

interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  averageOrderValue: number;
  aovChange: number;
  conversionRate: number;
  conversionChange: number;
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  newCustomers: number;
}

// ============================================
// DUMMY DATA
// ============================================

const dashboardStats: DashboardStats = {
  totalRevenue: 125840.50,
  revenueChange: 12.5,
  totalOrders: 1248,
  ordersChange: 8.3,
  averageOrderValue: 100.83,
  aovChange: 4.2,
  conversionRate: 3.24,
  conversionChange: -0.8,
  totalProducts: 156,
  lowStockProducts: 12,
  totalCustomers: 3420,
  newCustomers: 248,
};

const products: Product[] = [
  {
    id: "prod_001",
    name: "Premium Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    sku: "WH-PRO-001",
    category: "Electronics",
    price: 299.99,
    comparePrice: 349.99,
    cost: 150.00,
    stock: 45,
    lowStockThreshold: 10,
    status: "active",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200"],
    tags: ["bestseller", "featured"],
    sales: 234,
    revenue: 70197.66,
    rating: 4.8,
    reviews: 156,
    createdAt: "2024-01-15",
    updatedAt: "2024-01-20",
  },
  {
    id: "prod_002",
    name: "Smart Watch Pro",
    description: "Advanced smartwatch with health monitoring",
    sku: "SW-PRO-001",
    category: "Electronics",
    price: 449.99,
    comparePrice: 499.99,
    cost: 220.00,
    stock: 8,
    lowStockThreshold: 15,
    status: "active",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"],
    tags: ["new", "featured"],
    sales: 89,
    revenue: 40049.11,
    rating: 4.9,
    reviews: 67,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-18",
  },
  {
    id: "prod_003",
    name: "Leather Messenger Bag",
    description: "Genuine leather messenger bag for professionals",
    sku: "BAG-LTH-001",
    category: "Accessories",
    price: 189.99,
    cost: 75.00,
    stock: 32,
    lowStockThreshold: 10,
    status: "active",
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200"],
    tags: ["bestseller"],
    sales: 156,
    revenue: 29638.44,
    rating: 4.6,
    reviews: 89,
    createdAt: "2024-01-05",
    updatedAt: "2024-01-15",
  },
  {
    id: "prod_004",
    name: "Ergonomic Office Chair",
    description: "Premium ergonomic chair for home office",
    sku: "CHR-ERG-001",
    category: "Furniture",
    price: 599.99,
    comparePrice: 699.99,
    cost: 300.00,
    stock: 3,
    lowStockThreshold: 5,
    status: "active",
    images: ["https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=200"],
    tags: ["sale"],
    sales: 45,
    revenue: 26999.55,
    rating: 4.7,
    reviews: 34,
    createdAt: "2023-12-20",
    updatedAt: "2024-01-10",
  },
  {
    id: "prod_005",
    name: "Minimalist Desk Lamp",
    description: "Modern LED desk lamp with adjustable brightness",
    sku: "LMP-DSK-001",
    category: "Home & Office",
    price: 79.99,
    cost: 30.00,
    stock: 67,
    lowStockThreshold: 20,
    status: "active",
    images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200"],
    tags: [],
    sales: 312,
    revenue: 24956.88,
    rating: 4.5,
    reviews: 198,
    createdAt: "2023-11-15",
    updatedAt: "2024-01-05",
  },
  {
    id: "prod_006",
    name: "Wireless Keyboard & Mouse Set",
    description: "Slim wireless keyboard and mouse combo",
    sku: "KB-WL-001",
    category: "Electronics",
    price: 89.99,
    comparePrice: 109.99,
    cost: 40.00,
    stock: 0,
    lowStockThreshold: 15,
    status: "active",
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200"],
    tags: ["sale"],
    sales: 189,
    revenue: 17008.11,
    rating: 4.4,
    reviews: 123,
    createdAt: "2023-10-20",
    updatedAt: "2024-01-02",
  },
];

const orders: Order[] = [
  {
    id: "ord_001",
    orderNumber: "ORD-2024-001248",
    customer: {
      id: "cust_001",
      name: "John Smith",
      email: "john.smith@email.com",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
    },
    items: [
      {
        id: "item_001",
        productId: "prod_001",
        productName: "Premium Wireless Headphones",
        productImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100",
        quantity: 1,
        price: 299.99,
        total: 299.99,
      },
      {
        id: "item_002",
        productId: "prod_005",
        productName: "Minimalist Desk Lamp",
        productImage: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=100",
        quantity: 2,
        price: 79.99,
        total: 159.98,
      },
    ],
    subtotal: 459.97,
    tax: 41.40,
    shipping: 0,
    discount: 45.99,
    total: 455.38,
    status: "processing",
    paymentStatus: "paid",
    paymentMethod: "Credit Card",
    shippingAddress: {
      name: "John Smith",
      line1: "123 Main Street",
      line2: "Apt 4B",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
      phone: "+1 (555) 123-4567",
    },
    billingAddress: {
      name: "John Smith",
      line1: "123 Main Street",
      line2: "Apt 4B",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
    },
    createdAt: "2024-01-20T10:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z",
  },
  {
    id: "ord_002",
    orderNumber: "ORD-2024-001247",
    customer: {
      id: "cust_002",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    },
    items: [
      {
        id: "item_003",
        productId: "prod_002",
        productName: "Smart Watch Pro",
        productImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100",
        quantity: 1,
        price: 449.99,
        total: 449.99,
      },
    ],
    subtotal: 449.99,
    tax: 40.50,
    shipping: 9.99,
    discount: 0,
    total: 500.48,
    status: "shipped",
    paymentStatus: "paid",
    paymentMethod: "PayPal",
    shippingAddress: {
      name: "Sarah Johnson",
      line1: "456 Oak Avenue",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      country: "USA",
    },
    billingAddress: {
      name: "Sarah Johnson",
      line1: "456 Oak Avenue",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      country: "USA",
    },
    createdAt: "2024-01-19T15:20:00Z",
    updatedAt: "2024-01-20T09:00:00Z",
  },
  {
    id: "ord_003",
    orderNumber: "ORD-2024-001246",
    customer: {
      id: "cust_003",
      name: "Michael Brown",
      email: "m.brown@email.com",
    },
    items: [
      {
        id: "item_004",
        productId: "prod_003",
        productName: "Leather Messenger Bag",
        productImage: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=100",
        quantity: 1,
        price: 189.99,
        total: 189.99,
      },
    ],
    subtotal: 189.99,
    tax: 17.10,
    shipping: 12.99,
    discount: 19.00,
    total: 201.08,
    status: "delivered",
    paymentStatus: "paid",
    paymentMethod: "Credit Card",
    shippingAddress: {
      name: "Michael Brown",
      line1: "789 Pine Street",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "USA",
    },
    billingAddress: {
      name: "Michael Brown",
      line1: "789 Pine Street",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "USA",
    },
    createdAt: "2024-01-18T11:45:00Z",
    updatedAt: "2024-01-20T16:30:00Z",
  },
  {
    id: "ord_004",
    orderNumber: "ORD-2024-001245",
    customer: {
      id: "cust_004",
      name: "Emily Davis",
      email: "emily.d@email.com",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    },
    items: [
      {
        id: "item_005",
        productId: "prod_004",
        productName: "Ergonomic Office Chair",
        productImage: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=100",
        quantity: 1,
        price: 599.99,
        total: 599.99,
      },
    ],
    subtotal: 599.99,
    tax: 54.00,
    shipping: 0,
    discount: 100.00,
    total: 553.99,
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "Bank Transfer",
    shippingAddress: {
      name: "Emily Davis",
      line1: "321 Elm Road",
      city: "Houston",
      state: "TX",
      postalCode: "77001",
      country: "USA",
    },
    billingAddress: {
      name: "Emily Davis",
      line1: "321 Elm Road",
      city: "Houston",
      state: "TX",
      postalCode: "77001",
      country: "USA",
    },
    createdAt: "2024-01-20T08:15:00Z",
    updatedAt: "2024-01-20T08:15:00Z",
  },
  {
    id: "ord_005",
    orderNumber: "ORD-2024-001244",
    customer: {
      id: "cust_005",
      name: "David Wilson",
      email: "d.wilson@email.com",
    },
    items: [
      {
        id: "item_006",
        productId: "prod_006",
        productName: "Wireless Keyboard & Mouse Set",
        productImage: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=100",
        quantity: 3,
        price: 89.99,
        total: 269.97,
      },
    ],
    subtotal: 269.97,
    tax: 24.30,
    shipping: 9.99,
    discount: 0,
    total: 304.26,
    status: "cancelled",
    paymentStatus: "refunded",
    paymentMethod: "Credit Card",
    shippingAddress: {
      name: "David Wilson",
      line1: "654 Maple Drive",
      city: "Seattle",
      state: "WA",
      postalCode: "98101",
      country: "USA",
    },
    billingAddress: {
      name: "David Wilson",
      line1: "654 Maple Drive",
      city: "Seattle",
      state: "WA",
      postalCode: "98101",
      country: "USA",
    },
    notes: "Customer requested cancellation due to change in requirements",
    createdAt: "2024-01-17T14:00:00Z",
    updatedAt: "2024-01-18T10:30:00Z",
  },
];

const categories: Category[] = [
  { id: "cat_001", name: "Electronics", slug: "electronics", productCount: 45, image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200" },
  { id: "cat_002", name: "Accessories", slug: "accessories", productCount: 32, image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=200" },
  { id: "cat_003", name: "Furniture", slug: "furniture", productCount: 28, image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200" },
  { id: "cat_004", name: "Home & Office", slug: "home-office", productCount: 51, image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=200" },
];

const coupons: Coupon[] = [
  { id: "coup_001", code: "WELCOME20", type: "percentage", value: 20, minPurchase: 50, maxUses: 1000, usedCount: 456, startDate: "2024-01-01", endDate: "2024-03-31", status: "active" },
  { id: "coup_002", code: "SAVE50", type: "fixed", value: 50, minPurchase: 200, maxUses: 500, usedCount: 123, startDate: "2024-01-15", endDate: "2024-02-15", status: "active" },
  { id: "coup_003", code: "FREESHIP", type: "free_shipping", value: 0, minPurchase: 100, maxUses: undefined, usedCount: 789, startDate: "2024-01-01", endDate: "2024-12-31", status: "active" },
];

const revenueData = [
  { month: "Jan", revenue: 45000, orders: 312 },
  { month: "Feb", revenue: 52000, orders: 356 },
  { month: "Mar", revenue: 48000, orders: 334 },
  { month: "Apr", revenue: 61000, orders: 412 },
  { month: "May", revenue: 55000, orders: 378 },
  { month: "Jun", revenue: 67000, orders: 445 },
  { month: "Jul", revenue: 72000, orders: 489 },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
    case "delivered":
    case "paid":
      return { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" };
    case "processing":
    case "shipped":
      return { bg: "bg-blue-50", text: "text-[#0891B2]", dot: "bg-[#0891B2]" };
    case "pending":
      return { bg: "bg-yellow-50", text: "text-yellow-600", dot: "bg-yellow-500" };
    case "cancelled":
    case "failed":
    case "archived":
      return { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" };
    case "refunded":
      return { bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-500" };
    case "draft":
      return { bg: "bg-[#F8FAFC]", text: "text-[#475569]", dot: "bg-[#F8FAFC]0" };
    case "expired":
    case "disabled":
      return { bg: "bg-white/5", text: "text-[#94A3B8]", dot: "bg-slate-400" };
    default:
      return { bg: "bg-[#F8FAFC]", text: "text-[#475569]", dot: "bg-[#F8FAFC]0" };
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  prefix = "",
  delay = 0,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: "teal" | "gold" | "navy" | "purple" | "green" | "blue" | "red";
  prefix?: string;
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    blue: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-blue-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            {prefix}{typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <ArrowUpRight size={14} className="text-green-500" />
              ) : (
                <ArrowDownRight size={14} className="text-red-500" />
              )}
              <span className={cn("text-xs font-semibold", change >= 0 ? "text-green-600" : "text-red-600")}>
                {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-xs text-[#475569]">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-md flex items-center justify-center", colors.light)}>
          <Icon size={22} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// PRODUCT CARD COMPONENT
// ============================================

const ProductCard = ({
  product,
  onView,
  onEdit,
  onDelete,
  delay = 0,
}: {
  product: Product;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  delay?: number;
}) => {
  const statusColors = getStatusColor(product.status);
  const isLowStock = product.stock <= product.lowStockThreshold;
  const isOutOfStock = product.stock === 0;
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all group"
    >
      {/* Image */}
      <div className="relative h-48 bg-white/5">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} className="text-[#475569]" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {discount > 0 && (
            <span className="px-2 py-1 rounded-md bg-red-500 text-[#0F172A] text-xs font-bold">
              -{discount}%
            </span>
          )}
          {product.tags.includes("bestseller") && (
            <span className="px-2 py-1 rounded-md bg-[#D97706] text-[#0F172A] text-xs font-bold">
              Bestseller
            </span>
          )}
          {product.tags.includes("new") && (
            <span className="px-2 py-1 rounded-md bg-[#0891B2] text-white text-xs font-bold">
              New
            </span>
          )}
        </div>

        {/* Stock Warning */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="px-4 py-2 bg-red-500 text-[#0F172A] font-bold rounded-md">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md bg-white/90 backdrop-blur-sm hover:bg-white"
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md">
                <Pencil size={14} className="mr-2" /> Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Copy size={14} className="mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-xs text-[#475569] mb-1">{product.category}</p>
            <h3 className="font-semibold text-[#0F172A] line-clamp-1 group-hover:text-[#0891B2] transition-colors">
              {product.name}
            </h3>
          </div>
          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", statusColors.bg, statusColors.text)}>
            {product.status}
          </span>
        </div>

        {/* SKU */}
        <p className="text-xs text-[#475569] mb-3">SKU: {product.sku}</p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg font-bold text-[#0F172A]">{formatCurrency(product.price)}</span>
          {product.comparePrice && (
            <span className="text-sm text-[#475569] line-through">{formatCurrency(product.comparePrice)}</span>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-3 border-t border-[rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-[#D97706] fill-[#FBBF24]" />
            <span className="text-sm font-medium text-[#0F172A]">{product.rating}</span>
            <span className="text-xs text-[#475569]">({product.reviews})</span>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isOutOfStock ? "text-red-500" : isLowStock ? "text-yellow-600" : "text-[#94A3B8]"
          )}>
            <Box size={14} />
            {isOutOfStock ? "Out of stock" : `${product.stock} in stock`}
          </div>
        </div>

        {/* Low Stock Warning */}
        {isLowStock && !isOutOfStock && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-50 text-yellow-700">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium">Low stock alert</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// ORDER ROW COMPONENT
// ============================================

const OrderRow = ({
  order,
  onView,
  onUpdateStatus,
}: {
  order: Order;
  onView: () => void;
  onUpdateStatus: (status: Order["status"]) => void;
}) => {
  const statusColors = getStatusColor(order.status);
  const paymentColors = getStatusColor(order.paymentStatus);

  return (
    <TableRow className="group hover:bg-[#F8FAFC]">
      <TableCell>
        <div className="flex items-center gap-3">
          <Checkbox className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]" />
          <div>
            <p className="font-semibold text-[#0F172A]">{order.orderNumber}</p>
            <p className="text-xs text-[#475569]">{getRelativeTime(order.createdAt)}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          {order.customer.avatar ? (
            <img
              src={order.customer.avatar}
              alt={order.customer.name}
              className="w-8 h-8 rounded-md object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xs font-bold">
              {getInitials(order.customer.name)}
            </div>
          )}
          <div>
            <p className="font-medium text-[#0F172A]">{order.customer.name}</p>
            <p className="text-xs text-[#475569]">{order.customer.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {order.items.slice(0, 3).map((item, i) => (
              <img
                key={item.id}
                src={item.productImage}
                alt={item.productName}
                className="w-8 h-8 rounded-md border-2 border-white object-cover"
              />
            ))}
          </div>
          <span className="text-sm text-[#94A3B8]">
            {order.items.length} item{order.items.length > 1 ? "s" : ""}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-[#0F172A]">{formatCurrency(order.total)}</span>
      </TableCell>
      <TableCell>
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
          statusColors.bg, statusColors.text
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", statusColors.dot)} />
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </TableCell>
      <TableCell>
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
          paymentColors.bg, paymentColors.text
        )}>
          {order.paymentStatus === "paid" && <CheckCircle2 size={12} />}
          {order.paymentStatus === "pending" && <Clock size={12} />}
          {order.paymentStatus === "failed" && <AlertCircle size={12} />}
          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onView}>
            <Eye size={16} className="text-[#475569]" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                <MoreVertical size={16} className="text-[#475569]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <FileText size={14} className="mr-2" /> Print Invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdateStatus("processing")} className="rounded-md">
                <RefreshCw size={14} className="mr-2" /> Mark Processing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus("shipped")} className="rounded-md">
                <Truck size={14} className="mr-2" /> Mark Shipped
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus("delivered")} className="rounded-md">
                <PackageCheck size={14} className="mr-2" /> Mark Delivered
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdateStatus("cancelled")} className="rounded-md text-red-600 focus:text-red-600">
                <PackageX size={14} className="mr-2" /> Cancel Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

// ============================================
// TOP PRODUCTS TABLE
// ============================================

const TopProductsTable = ({ products }: { products: Product[] }) => {
  const topProducts = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
    >
      <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#0F172A]">Top Selling Products</h3>
            <p className="text-sm text-[#94A3B8]">Best performers this month</p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-md text-[#0891B2]">
            View All <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>

      <div className="divide-y divide-[rgba(15,23,42,0.06)]">
        {topProducts.map((product, index) => (
          <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-[#F8FAFC] transition-colors">
            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-[#94A3B8]">
              {index + 1}
            </span>
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-12 h-12 rounded-md object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#0F172A] truncate">{product.name}</p>
              <p className="text-sm text-[#94A3B8]">{product.sales} sales</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-[#0F172A]">{formatCurrency(product.revenue)}</p>
              <p className="text-xs text-[#475569]">Revenue</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================
// RECENT ORDERS TABLE
// ============================================

const RecentOrdersTable = ({ orders }: { orders: Order[] }) => {
  const recentOrders = [...orders].slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
    >
      <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#0F172A]">Recent Orders</h3>
            <p className="text-sm text-[#94A3B8]">Latest transactions</p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-md text-[#0891B2]">
            View All <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>

      <div className="divide-y divide-[rgba(15,23,42,0.06)]">
        {recentOrders.map((order) => {
          const statusColors = getStatusColor(order.status);
          return (
            <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-[#F8FAFC] transition-colors">
              <div className="flex items-center gap-3 flex-1">
                {order.customer.avatar ? (
                  <img
                    src={order.customer.avatar}
                    alt={order.customer.name}
                    className="w-10 h-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-sm font-bold">
                    {getInitials(order.customer.name)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-[#0F172A]">{order.customer.name}</p>
                  <p className="text-sm text-[#94A3B8]">{order.orderNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#0F172A]">{formatCurrency(order.total)}</p>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                  statusColors.bg, statusColors.text
                )}>
                  <span className={cn("w-1 h-1 rounded-full", statusColors.dot)} />
                  {order.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// ============================================
// LOW STOCK ALERT COMPONENT
// ============================================

const LowStockAlert = ({ products }: { products: Product[] }) => {
  const lowStockProducts = products.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
    >
      <div className="p-5 border-b border-[rgba(15,23,42,0.06)] bg-red-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">Inventory Alerts</h3>
            <p className="text-sm text-[#94A3B8]">
              {outOfStockProducts.length} out of stock, {lowStockProducts.length} low stock
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[rgba(15,23,42,0.06)] max-h-[300px] overflow-y-auto">
        {outOfStockProducts.map((product) => (
          <div key={product.id} className="flex items-center gap-4 p-4 bg-red-50/50">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-10 h-10 rounded-md object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#0F172A] truncate">{product.name}</p>
              <p className="text-xs text-red-500 font-semibold">Out of Stock</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-md text-red-500 border-red-200 hover:bg-red-50">
              Restock
            </Button>
          </div>
        ))}
        {lowStockProducts.map((product) => (
          <div key={product.id} className="flex items-center gap-4 p-4">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-10 h-10 rounded-md object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#0F172A] truncate">{product.name}</p>
              <p className="text-xs text-yellow-600 font-semibold">{product.stock} left in stock</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-md">
              Restock
            </Button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================
// REVENUE CHART COMPONENT
// ============================================

const RevenueChart = () => {
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-[#0F172A]">Revenue Overview</h3>
          <p className="text-sm text-[#94A3B8]">Monthly revenue performance</p>
        </div>
        <Select defaultValue="7months">
          <SelectTrigger className="w-40 h-9 rounded-md border-[rgba(15,23,42,0.06)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="7months">Last 7 Months</SelectItem>
            <SelectItem value="1year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Simple Bar Chart */}
      <div className="flex items-end justify-between gap-3 h-48">
        {revenueData.map((data, index) => (
          <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(data.revenue / maxRevenue) * 100}%` }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              className="w-full bg-[#0891B2] rounded-t-lg relative group cursor-pointer"
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#F8FAFC] text-[#0F172A] px-2 py-1 rounded-md text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {formatCurrency(data.revenue)}
              </div>
            </motion.div>
            <span className="text-xs text-[#94A3B8]">{data.month}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#0891B2]" />
            <span className="text-sm text-[#475569]">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#D97706]" />
            <span className="text-sm text-[#475569]">Orders</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
          <TrendingUp size={14} />
          +12.5% vs last period
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// CATEGORY CARD COMPONENT
// ============================================

const CategoryCard = ({
  category,
  delay = 0,
}: {
  category: Category;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all cursor-pointer group"
    >
      <div className="relative h-32">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-[#F1F5F9] flex items-center justify-center">
            <Grid3X3 size={32} className="text-[#475569]" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-semibold text-[#0F172A]">{category.name}</h3>
          <p className="text-xs text-[#0F172A]/80">{category.productCount} products</p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// ADD PRODUCT DIALOG
// ============================================

const AddProductDialog = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Partial<Product>) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    category: "",
    price: "",
    comparePrice: "",
    cost: "",
    stock: "",
    status: "draft" as Product["status"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price) || 0,
      comparePrice: parseFloat(formData.comparePrice) || undefined,
      cost: parseFloat(formData.cost) || 0,
      stock: parseInt(formData.stock) || 0,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">Add New Product</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Add a new product to your inventory
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product Images */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Product Images</Label>
            <div className="border-2 border-dashed border-[rgba(15,23,42,0.06)] rounded-md p-8 text-center hover:border-[#22D3EE] transition-colors cursor-pointer">
              <div className="w-12 h-12 mx-auto mb-3 rounded-md bg-white/5 flex items-center justify-center">
                <ImageIcon size={24} className="text-[#475569]" />
              </div>
              <p className="text-sm text-[#475569] mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-[#475569]">PNG, JPG up to 10MB</p>
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter product name"
              required
              className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product description"
              rows={3}
              className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
            />
          </div>

          {/* SKU & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., PROD-001"
                className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug} className="rounded-md">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#475569]">Pricing</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[#94A3B8]">
                  Price <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                    className="h-11 pl-9 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#94A3B8]">Compare Price</Label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.comparePrice}
                    onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                    placeholder="0.00"
                    className="h-11 pl-9 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#94A3B8]">Cost</Label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    className="h-11 pl-9 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Stock Quantity</Label>
              <div className="relative">
                <Box size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="h-11 pl-9 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val as Product["status"] })}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="draft" className="rounded-md">Draft</SelectItem>
                  <SelectItem value="active" className="rounded-md">Active</SelectItem>
                  <SelectItem value="archived" className="rounded-md">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              <Plus size={16} className="mr-2" />
              Add Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// ORDER DETAILS DIALOG
// ============================================

const OrderDetailsDialog = ({
  isOpen,
  onClose,
  order,
  onUpdateStatus,
}: {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onUpdateStatus: (status: Order["status"]) => void;
}) => {
  if (!order) return null;

  const statusColors = getStatusColor(order.status);
  const paymentColors = getStatusColor(order.paymentStatus);

  const statusSteps = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "processing", label: "Processing", icon: RefreshCw },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: PackageCheck },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] sticky top-0 bg-white z-10">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-[#0F172A]">
                  Order {order.orderNumber}
                </DialogTitle>
                <DialogDescription className="text-[#94A3B8]">
                  Placed on {new Date(order.createdAt).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
                  statusColors.bg, statusColors.text
                )}>
                  <span className={cn("w-2 h-2 rounded-full", statusColors.dot)} />
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Status Timeline */}
          {order.status !== "cancelled" && order.status !== "refunded" && (
            <div className="bg-[#F8FAFC] rounded-md p-5">
              <h4 className="font-semibold text-[#0F172A] mb-4">Order Progress</h4>
              <div className="flex items-center justify-between">
                {statusSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-12 h-12 rounded-md flex items-center justify-center mb-2 transition-all",
                          isCompleted
                            ? "bg-[#0891B2] text-white"
                            : "bg-slate-200 text-[#475569]"
                        )}>
                          <StepIcon size={20} />
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          isCompleted ? "text-[#0891B2]" : "text-[#475569]"
                        )}>
                          {step.label}
                        </span>
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div className={cn(
                          "flex-1 h-1 rounded-full mx-2",
                          index < currentStepIndex ? "bg-[#0891B2]" : "bg-slate-200"
                        )} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-[#0F172A]">Customer Information</h4>
              <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] rounded-md">
                {order.customer.avatar ? (
                  <img
                    src={order.customer.avatar}
                    alt={order.customer.name}
                    className="w-12 h-12 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold">
                    {getInitials(order.customer.name)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[#0F172A]">{order.customer.name}</p>
                  <p className="text-sm text-[#94A3B8]">{order.customer.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-[#F8FAFC] rounded-md">
                  <p className="text-xs text-[#94A3B8] mb-2">Shipping Address</p>
                  <p className="text-sm text-[#0F172A] font-medium">{order.shippingAddress.name}</p>
                  <p className="text-sm text-[#475569]">{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && (
                    <p className="text-sm text-[#475569]">{order.shippingAddress.line2}</p>
                  )}
                  <p className="text-sm text-[#475569]">
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </p>
                  <p className="text-sm text-[#475569]">{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && (
                    <p className="text-sm text-[#94A3B8] mt-2">{order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-[#0F172A]">Payment Information</h4>
              <div className="p-4 bg-[#F8FAFC] rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94A3B8]">Payment Method</span>
                  <span className="text-sm font-medium text-[#0F172A]">{order.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94A3B8]">Payment Status</span>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium",
                    paymentColors.bg, paymentColors.text
                  )}>
                    {order.paymentStatus === "paid" && <CheckCircle2 size={12} />}
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>

              {order.notes && (
                <div className="p-4 bg-yellow-50 rounded-md">
                  <p className="text-xs text-yellow-600 font-medium mb-1">Order Notes</p>
                  <p className="text-sm text-yellow-800">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <h4 className="font-semibold text-[#0F172A]">Order Items</h4>
            <div className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC]">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-12 h-12 rounded-md object-cover"
                          />
                          <div>
                            <p className="font-medium text-[#0F172A]">{item.productName}</p>
                            {item.variant && (
                              <p className="text-xs text-[#94A3B8]">{item.variant}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#94A3B8]">Subtotal</span>
                <span className="text-[#0F172A]">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#94A3B8]">Tax</span>
                <span className="text-[#0F172A]">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#94A3B8]">Shipping</span>
                <span className="text-[#0F172A]">
                  {order.shipping === 0 ? "Free" : formatCurrency(order.shipping)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">Discount</span>
                  <span className="text-green-600">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-[rgba(15,23,42,0.06)]">
                <span className="font-semibold text-[#0F172A]">Total</span>
                <span className="text-xl font-bold text-[#0F172A]">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 border-t border-[rgba(15,23,42,0.06)]">
          <Button variant="outline" className="rounded-md">
            <FileText size={16} className="mr-2" />
            Print Invoice
          </Button>
          {order.status === "pending" && (
            <Button
              onClick={() => onUpdateStatus("processing")}
              className="bg-[#0891B2] hover:bg-[#0891B2] text-white rounded-md"
            >
              <RefreshCw size={16} className="mr-2" />
              Start Processing
            </Button>
          )}
          {order.status === "processing" && (
            <Button
              onClick={() => onUpdateStatus("shipped")}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              <Truck size={16} className="mr-2" />
              Mark as Shipped
            </Button>
          )}
          {order.status === "shipped" && (
            <Button
              onClick={() => onUpdateStatus("delivered")}
              className="bg-green-500 hover:bg-green-600 text-[#0F172A] rounded-md"
            >
              <PackageCheck size={16} className="mr-2" />
              Mark as Delivered
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN ECOMMERCE PAGE COMPONENT
// ============================================

const EcommercePage = () => {
  const { toast } = useToast();

  // State
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [productList, setProductList] = useState<Product[]>([]);
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [prodData, ordData] = await Promise.allSettled([
          fetchProductsApi(),
          fetchOrdersApi(),
        ]);
        if (!cancelled) {
          if (prodData.status === 'fulfilled' && Array.isArray(prodData.value) && prodData.value.length) {
            setProductList(prodData.value.map((p: any) => ({
              id: p.id,
              name: p.name || '',
              description: p.description || '',
              sku: p.sku || '',
              category: p.category?.name || p.categoryId || 'Uncategorized',
              price: p.price ?? 0,
              comparePrice: p.compareAtPrice,
              cost: (p as any).cost ?? 0,
              stock: p.stock ?? 0,
              lowStockThreshold: (p as any).lowStockThreshold ?? 10,
              status: p.status || 'active',
              images: p.images || [],
              tags: (p as any).tags || [],
              sales: (p as any).sales ?? 0,
              revenue: (p as any).revenue ?? 0,
              rating: (p as any).rating ?? 0,
              reviews: (p as any).reviews ?? 0,
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: p.updatedAt || new Date().toISOString(),
            })));
          } else {
            setProductList(products);
          }
          if (ordData.status === 'fulfilled' && Array.isArray(ordData.value) && ordData.value.length) {
            setOrderList(ordData.value.map((o: any) => ({
              id: o.id,
              orderNumber: o.orderNumber || o.id,
              customer: { id: o.customerId || o.id, name: o.customerName || 'Unknown', email: o.customerEmail || '' },
              items: (o.items || []).map((it: any) => ({ ...it, total: it.total || it.price * it.quantity })),
              subtotal: o.subtotal ?? o.total ?? 0,
              tax: o.tax ?? 0,
              shipping: o.shipping ?? 0,
              discount: o.discount ?? 0,
              total: o.total ?? 0,
              status: o.status || 'pending',
              paymentStatus: o.paymentStatus || 'pending',
              paymentMethod: o.paymentMethod || 'Unknown',
              shippingAddress: o.shippingAddress || { name: '', line1: '', city: '', state: '', postalCode: '', country: '' },
              billingAddress: o.billingAddress || { name: '', line1: '', city: '', state: '', postalCode: '', country: '' },
              notes: o.notes,
              createdAt: o.createdAt || new Date().toISOString(),
              updatedAt: o.updatedAt || new Date().toISOString(),
            })));
          } else {
            setOrderList(orders);
          }
        }
      } catch {
        if (!cancelled) { setProductList(products); setOrderList(orders); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Dialogs
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return productList;
    return productList.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productList, searchTerm]);

  // Handlers
  const handleAddProduct = async (productData: Partial<Product>) => {
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name: productData.name || "",
      description: productData.description || "",
      sku: productData.sku || `SKU-${Date.now()}`,
      category: productData.category || "Uncategorized",
      price: productData.price || 0,
      comparePrice: productData.comparePrice,
      cost: productData.cost || 0,
      stock: productData.stock || 0,
      lowStockThreshold: 10,
      status: productData.status || "draft",
      images: [],
      tags: [],
      sales: 0,
      revenue: 0,
      rating: 0,
      reviews: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProductList((prev) => [newProduct, ...prev]);

    try {
      const created = await createProductApi({
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        sku: newProduct.sku,
        stock: newProduct.stock,
        status: newProduct.status,
      });
      setProductList((prev) =>
        prev.map((p) => (p.id === newProduct.id ? { ...p, id: created.id } : p))
      );
    } catch { /* optimistic */ }

    toast({
      title: "Product Added",
      description: `"${newProduct.name}" has been added successfully.`,
    });
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order["status"]) => {
    setOrderList((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status, updatedAt: new Date().toISOString() }
          : o
      )
    );

    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, status, updatedAt: new Date().toISOString() } : null
      );
    }

    try { await updateOrderApi(orderId, { status }); } catch { /* optimistic */ }

    toast({
      title: "Order Updated",
      description: `Order status changed to ${status}.`,
    });
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Title & Breadcrumb */}
              <div>
                <div className="flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <span>Dashboard</span>
                  <ChevronRight size={14} />
                  <span className="text-[#0891B2] font-medium">Ecommerce</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Ecommerce</h1>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                >
                  <Plus size={18} className="mr-2" />
                  Add Product
                </Button>

                <div className="relative">
                  <button className="p-2.5 rounded-md bg-white/5 hover:bg-slate-200 transition-colors relative">
                    <Bell size={20} className="text-[#475569]" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  </button>
                </div>

                <div className="flex items-center gap-3 pl-3 border-l border-[rgba(15,23,42,0.06)]">
                  <div className="h-10 w-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold ">
                    SA
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-[#0F172A]">SAdmin</p>
                    <p className="text-xs text-[#94A3B8]">Administrator</p>
                  </div>
                  <ChevronDown size={16} className="text-[#475569]" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <div className="flex items-center gap-1">
              {[
                { id: "dashboard", label: "Dashboard", icon: BarChart3 },
                { id: "products", label: "Products", icon: Package },
                { id: "orders", label: "Orders", icon: ShoppingCart },
                { id: "categories", label: "Categories", icon: Grid3X3 },
                { id: "coupons", label: "Coupons", icon: BadgePercent },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all",
                    activeTab === tab.id
                      ? "text-[#0891B2] border-[#22D3EE]"
                      : "text-[#94A3B8] border-transparent hover:text-slate-200"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(dashboardStats.totalRevenue)}
                  change={dashboardStats.revenueChange}
                  changeLabel="vs last month"
                  icon={CircleDollarSign}
                  color="teal"
                  delay={0}
                />
                <StatCard
                  title="Total Orders"
                  value={dashboardStats.totalOrders}
                  change={dashboardStats.ordersChange}
                  changeLabel="vs last month"
                  icon={ShoppingBag}
                  color="gold"
                  delay={0.1}
                />
                <StatCard
                  title="Average Order Value"
                  value={formatCurrency(dashboardStats.averageOrderValue)}
                  change={dashboardStats.aovChange}
                  changeLabel="vs last month"
                  icon={Receipt}
                  color="blue"
                  delay={0.2}
                />
                <StatCard
                  title="Conversion Rate"
                  value={`${dashboardStats.conversionRate}%`}
                  change={dashboardStats.conversionChange}
                  changeLabel="vs last month"
                  icon={TrendingUp}
                  color="purple"
                  delay={0.3}
                />
              </div>

              {/* Revenue Chart */}
              <RevenueChart />

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopProductsTable products={productList} />
                <RecentOrdersTable orders={orderList} />
              </div>

              {/* Low Stock Alert */}
              <LowStockAlert products={productList} />
            </div>
          )}

          {/* Products Tab */}
          {activeTab === "products" && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-md border border-[rgba(15,23,42,0.06)]">
                <div className="relative flex-1 max-w-md">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="h-11 pl-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40 h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.slug} className="rounded-md">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select defaultValue="all">
                    <SelectTrigger className="w-32 h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Status</SelectItem>
                      <SelectItem value="active" className="rounded-md">Active</SelectItem>
                      <SelectItem value="draft" className="rounded-md">Draft</SelectItem>
                      <SelectItem value="archived" className="rounded-md">Archived</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center p-1 bg-white/5 rounded-md">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === "grid"
                          ? "bg-white text-[#0891B2] shadow-sm"
                          : "text-[#94A3B8]"
                      )}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === "list"
                          ? "bg-white text-[#0891B2] shadow-sm"
                          : "text-[#94A3B8]"
                      )}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onView={() => toast({ title: "View Product", description: product.name })}
                    onEdit={() => toast({ title: "Edit Product", description: product.name })}
                    onDelete={() => {
                      setProductList((prev) => prev.filter((p) => p.id !== product.id));
                      toast({ title: "Product Deleted", description: product.name });
                    }}
                    delay={index * 0.05}
                  />
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 bg-white rounded-md border border-[rgba(15,23,42,0.06)]"
                >
                  <div className="w-20 h-20 rounded-md bg-white/5 flex items-center justify-center mb-4">
                    <Package size={40} className="text-[#475569]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No products found</h3>
                  <p className="text-[#94A3B8] text-center mb-6">
                    {searchTerm ? `No products match "${searchTerm}"` : "Add your first product to get started"}
                  </p>
                  <Button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Product
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              {/* Order Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { label: "All Orders", count: orderList.length, color: "bg-white/5 text-[#475569]" },
                  { label: "Pending", count: orderList.filter((o) => o.status === "pending").length, color: "bg-yellow-100 text-yellow-600" },
                  { label: "Processing", count: orderList.filter((o) => o.status === "processing").length, color: "bg-blue-100 text-[#0891B2]" },
                  { label: "Shipped", count: orderList.filter((o) => o.status === "shipped").length, color: "bg-purple-100 text-purple-600" },
                  { label: "Delivered", count: orderList.filter((o) => o.status === "delivered").length, color: "bg-green-100 text-green-600" },
                ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    whileHover={{ y: -2 }}
                    className={cn(
                      "p-4 rounded-md text-center cursor-pointer transition-all hover:shadow-md",
                      stat.color
                    )}
                  >
                    <p className="text-xl sm:text-2xl font-bold">{stat.count}</p>
                    <p className="text-sm font-medium">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
                <div className="p-5 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#0F172A]">All Orders</h3>
                    <p className="text-sm text-[#94A3B8]">{orderList.length} total orders</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="rounded-md">
                      <Filter size={16} className="mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" className="rounded-md">
                      <Download size={16} className="mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F8FAFC]">
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderList.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onView={() => handleViewOrder(order)}
                        onUpdateStatus={(status) => handleUpdateOrderStatus(order.id, status)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0F172A]">Product Categories</h2>
                  <p className="text-sm text-[#94A3B8]">{categories.length} categories</p>
                </div>
                <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
                  <Plus size={16} className="mr-2" />
                  Add Category
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((category, index) => (
                  <CategoryCard key={category.id} category={category} delay={index * 0.1} />
                ))}
              </div>
            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === "coupons" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#0F172A]">Discount Coupons</h2>
                  <p className="text-sm text-[#94A3B8]">{coupons.length} active coupons</p>
                </div>
                <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
                  <Plus size={16} className="mr-2" />
                  Create Coupon
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon, index) => {
                  const statusColors = getStatusColor(coupon.status);
                  const usagePercent = coupon.maxUses
                    ? (coupon.usedCount / coupon.maxUses) * 100
                    : 0;

                  return (
                    <motion.div
                      key={coupon.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-md bg-[#F1F5F9] flex items-center justify-center">
                              {coupon.type === "percentage" && <Percent size={24} className="text-[#0891B2]" />}
                              {coupon.type === "fixed" && <DollarSign size={24} className="text-[#0891B2]" />}
                              {coupon.type === "free_shipping" && <Truck size={24} className="text-[#0891B2]" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-[#0F172A] font-mono">{coupon.code}</h3>
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                                statusColors.bg, statusColors.text
                              )}>
                                {coupon.status}
                              </span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-md">
                              <DropdownMenuItem className="rounded-md">
                                <Pencil size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-md">
                                <Copy size={14} className="mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="rounded-md text-red-600">
                                <Trash2 size={14} className="mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#94A3B8]">Discount</span>
                            <span className="font-bold text-[#0F172A]">
                              {coupon.type === "percentage" && `${coupon.value}% OFF`}
                              {coupon.type === "fixed" && `${formatCurrency(coupon.value)} OFF`}
                              {coupon.type === "free_shipping" && "Free Shipping"}
                            </span>
                          </div>

                          {coupon.minPurchase && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#94A3B8]">Min. Purchase</span>
                              <span className="text-sm text-[#0F172A]">{formatCurrency(coupon.minPurchase)}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#94A3B8]">Valid Until</span>
                            <span className="text-sm text-[#0F172A]">
                              {new Date(coupon.endDate).toLocaleDateString()}
                            </span>
                          </div>

                          {coupon.maxUses && (
                            <div className="pt-3 border-t border-[rgba(15,23,42,0.06)]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[#94A3B8]">Usage</span>
                                <span className="text-xs text-[#94A3B8]">
                                  {coupon.usedCount} / {coupon.maxUses}
                                </span>
                              </div>
                              <Progress value={usagePercent} className="h-1.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Product Dialog */}
      <AddProductDialog
        isOpen={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onSubmit={handleAddProduct}
      />

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        isOpen={showOrderDetails}
        onClose={() => {
          setShowOrderDetails(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onUpdateStatus={(status) => {
          if (selectedOrder) {
            handleUpdateOrderStatus(selectedOrder.id, status);
          }
        }}
      />
    </div>
  );
};

export default EcommercePage;