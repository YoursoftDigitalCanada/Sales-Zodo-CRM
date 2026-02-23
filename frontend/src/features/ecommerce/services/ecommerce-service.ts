import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

// ── Products ────────────────────────────────────────────────────────────

export interface ProductEntity {
    id: string;
    name: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    sku?: string;
    stock: number;
    categoryId?: string;
    category?: CategoryEntity;
    images?: string[];
    status?: string;
    featured?: boolean;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface CreateProductPayload {
    name: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    sku?: string;
    stock?: number;
    categoryId?: string;
    images?: string[];
    status?: string;
    featured?: boolean;
    [key: string]: unknown;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> { }

export async function getProducts(params?: Record<string, unknown>): Promise<ProductEntity[]> {
    const response = await api.get("/ecommerce/products", { params: { limit: 100, ...params } });
    return extractApiArray<ProductEntity>(response.data);
}

export async function getProductById(id: string): Promise<ProductEntity> {
    const response = await api.get(`/ecommerce/products/${id}`);
    return response.data?.data || response.data;
}

export async function createProduct(data: CreateProductPayload): Promise<ProductEntity> {
    const response = await api.post("/ecommerce/products", data);
    return response.data?.data || response.data;
}

export async function updateProduct(id: string, data: UpdateProductPayload): Promise<ProductEntity> {
    const response = await api.put(`/ecommerce/products/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteProduct(id: string): Promise<void> {
    await api.delete(`/ecommerce/products/${id}`);
}

// ── Categories ──────────────────────────────────────────────────────────

export interface CategoryEntity {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    children?: CategoryEntity[];
    productCount?: number;
    createdAt?: string;
    [key: string]: unknown;
}

export interface CreateCategoryPayload {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    [key: string]: unknown;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> { }

export async function getCategories(params?: Record<string, unknown>): Promise<CategoryEntity[]> {
    const response = await api.get("/ecommerce/categories", { params: { limit: 100, ...params } });
    return extractApiArray<CategoryEntity>(response.data);
}

export async function getCategoryTree(): Promise<CategoryEntity[]> {
    const response = await api.get("/ecommerce/categories/tree");
    return response.data?.data || response.data || [];
}

export async function createCategory(data: CreateCategoryPayload): Promise<CategoryEntity> {
    const response = await api.post("/ecommerce/categories", data);
    return response.data?.data || response.data;
}

export async function updateCategory(id: string, data: UpdateCategoryPayload): Promise<CategoryEntity> {
    const response = await api.put(`/ecommerce/categories/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteCategory(id: string): Promise<void> {
    await api.delete(`/ecommerce/categories/${id}`);
}

// ── Orders ──────────────────────────────────────────────────────────────

export interface OrderEntity {
    id: string;
    orderNumber?: string;
    customerName?: string;
    customerEmail?: string;
    status?: string;
    items?: Array<{ productId: string; productName?: string; quantity: number; price: number;[key: string]: unknown }>;
    subtotal?: number;
    tax?: number;
    shipping?: number;
    total: number;
    shippingAddress?: Record<string, unknown>;
    billingAddress?: Record<string, unknown>;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface CreateOrderPayload {
    customerName: string;
    customerEmail?: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
    shippingAddress?: Record<string, unknown>;
    billingAddress?: Record<string, unknown>;
    notes?: string;
    [key: string]: unknown;
}

export interface UpdateOrderPayload extends Partial<CreateOrderPayload> {
    status?: string;
}

export async function getOrders(params?: Record<string, unknown>): Promise<OrderEntity[]> {
    const response = await api.get("/ecommerce/orders", { params: { limit: 100, ...params } });
    return extractApiArray<OrderEntity>(response.data);
}

export async function getOrderById(id: string): Promise<OrderEntity> {
    const response = await api.get(`/ecommerce/orders/${id}`);
    return response.data?.data || response.data;
}

export async function createOrder(data: CreateOrderPayload): Promise<OrderEntity> {
    const response = await api.post("/ecommerce/orders", data);
    return response.data?.data || response.data;
}

export async function updateOrder(id: string, data: UpdateOrderPayload): Promise<OrderEntity> {
    const response = await api.put(`/ecommerce/orders/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteOrder(id: string): Promise<void> {
    await api.delete(`/ecommerce/orders/${id}`);
}
