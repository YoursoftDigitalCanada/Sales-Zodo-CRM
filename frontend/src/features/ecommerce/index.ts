export {
    // Products
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    // Categories
    getCategories,
    getCategoryTree,
    createCategory,
    updateCategory,
    deleteCategory,
    // Orders
    getOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
} from "./services/ecommerce-service";
export type {
    ProductEntity,
    CreateProductPayload,
    UpdateProductPayload,
    CategoryEntity,
    CreateCategoryPayload,
    UpdateCategoryPayload,
    OrderEntity,
    CreateOrderPayload,
    UpdateOrderPayload,
} from "./services/ecommerce-service";
