import { Router } from 'express';
import productsRoutes from './products/products.routes';
import categoriesRoutes from './categories/categories.routes';
import ordersRoutes from './orders/orders.routes';

const router = Router();

router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/orders', ordersRoutes);

export default router;
