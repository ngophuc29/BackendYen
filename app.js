// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();


const transporter = require('./mailer');
// Initialize app and middleware
const app = express();
app.use(bodyParser.json());
// app.use(cors());
app.use(express.json({ limit: '30mb' })); // Tăng giới hạn payload lên 10MB

app.use(cors({
    origin: 'http://localhost:3001', // Cho phép chỉ từ localhost:3001
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Các phương thức HTTP bạn muốn cho phép
    allowedHeaders: ['Content-Type', 'Authorization'] // Các header cho phép
}));


// Connect to MongoDB

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected')).catch(err => console.error(err));

// Define Schemas and Models
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    description: { type: String },
    images: [String],
    productCode: { type: String, required: true },
    // quantityLimit: { type: Number, required: true },
    expirationDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
const Product = mongoose.model('Product', ProductSchema);

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    createdAt: { type: Date, default: Date.now },
});
const Customer = mongoose.model('Customer', CustomerSchema);

const OrderSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
        },
    ],
    address: { type: String, required: true },
    phone: { type: String, required: true },
    note: { type: String },
    totalPrice: { type: Number, required: true },
    shippingMethod: { type: String, required: true }, // e.g., 'standard', 'express'
    paymentMethod: { type: String, required: true }, // e.g., 'credit_card', 'cash_on_delivery'
    shippingFee: { type: Number, required: true }, // Shipping fee based on the method
    status: { type: String, default: 'pending' }, // e.g., pending, processing, completed, canceled
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', OrderSchema);

// CRUD Routes for Products
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get products by category
app.get('/products/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const products = await Product.find({ category });
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get a single product by ID
app.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.put('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CRUD Routes for Customers
app.get('/customers', async (req, res) => {
    try {
        const customers = await Customer.find().populate('orders');
        res.json(customers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/customers', async (req, res) => {
    try {
        const customer = new Customer(req.body);
        await customer.save();
        res.status(201).json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Find customer by email
app.get('/customers/email/:email', async (req, res) => {
    try {
        const customer = await Customer.findOne({ email: req.params.email });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Cập nhật thông tin khách hàng
app.put('/customers/:id', async (req, res) => {
    try {
        const { address, phone, email } = req.body; // Các trường cần cập nhật

        // Tìm khách hàng theo ID
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Cập nhật thông tin khách hàng
        customer.address = address || customer.address;
        customer.phone = phone || customer.phone;
        customer.email = email || customer.email;

        // Lưu lại thông tin đã cập nhật
        await customer.save();

        // Trả về thông tin khách hàng đã được cập nhật
        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CRUD Routes for Orders
app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().populate('customer').populate('products.productId');
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/orders', async (req, res) => {
    try {
        const { customerId, products, address, phone, note, paymentMethod, shippingMethod, shippingFee, totalPrice } = req.body;

        // Tạo đơn hàng mới
        const order = new Order({
            customer: customerId,
            products,
            address,
            phone,
            note,
            paymentMethod,
            shippingMethod,
            shippingFee,
            totalPrice,
        });

        // Lưu đơn hàng vào cơ sở dữ liệu
        await order.save();

        // Liên kết đơn hàng với khách hàng
        await Customer.findByIdAndUpdate(customerId, { $push: { orders: order._id } });

        // Gửi email xác nhận đơn hàng
        const customer = await Customer.findById(customerId);
        const productRows = await Promise.all(products.map(async item => {
            const product = await Product.findById(item.productId);
            return `
                <tr>
                    <td style="padding: 8px;">${product.name}</td>
                    <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; text-align: right;">${(product.price * item.quantity).toLocaleString()} VND</td>
                </tr>`;
        }));

        const mailOptions = {
            from: 'your-email@gmail.com',
            to: customer.email,
            subject: `Xác nhận đơn hàng Bird's Nest`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
                    <h1 style="color: #007bff;">Bird's Nest</h1>
                    <p>Xin chào ${customer.name},</p>
                    <p>Chúng tôi đã nhận được đặt hàng của bạn và đang xử lý.</p>
                    <hr>
                    <h2>Thông tin đơn hàng</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: left;">Sản phẩm</th>
                                <th style="border-bottom: 1px solid #ddd; padding: 8px;">Số lượng</th>
                                <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">Giá</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productRows.join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="padding: 8px; text-align: right;">Phí vận chuyển</td>
                                <td style="padding: 8px; text-align: right;">${shippingFee.toLocaleString()} VND</td>
                            </tr>
                            <tr>
                                <td colspan="2" style="padding: 8px; text-align: right;">Tổng cộng</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold;">${totalPrice.toLocaleString()} VND</td>
                            </tr>
                        </tfoot>
                    </table>
                    <hr>
                    <h2>Thông tin khách hàng</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tbody>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Tên khách hàng:</td>
                                <td style="padding: 8px;">${customer.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Email:</td>
                                <td style="padding: 8px;">${customer.email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Số điện thoại:</td>
                                <td style="padding: 8px;">${phone}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Địa chỉ:</td>
                                <td style="padding: 8px;">${address}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Phương thức thanh toán:</td>
                                <td style="padding: 8px;">${paymentMethod}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Phương thức vận chuyển:</td>
                                <td style="padding: 8px;">${shippingMethod}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Ghi chú:</td>
                                <td style="padding: 8px;">${note || 'Không có'}</td>
                            </tr>
                        </tbody>
                    </table>
                    <p style="margin-top: 20px;">Cảm ơn bạn đã mua hàng tại Bird's Nest!</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// app.put('/orders/status/:id', async (req, res) => {
//     try {
//         const { status } = req.body;
//         const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
//         res.json(order);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });
app.put('/orders/status/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id).populate('products.productId');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Nếu trạng thái đơn hàng là 'delivered', giảm stock của từng sản phẩm
        if (status === 'delivered') {
            for (const item of order.products) {
                const product = await Product.findById(item.productId);  // Tìm sản phẩm theo productId
                if (product) {
                    // Giảm stock của sản phẩm theo số lượng trong đơn hàng
                    product.stock -= item.quantity;
                    // Lưu lại sản phẩm với stock đã được cập nhật
                    await product.save();
                }
            }
        }

        // Cập nhật trạng thái đơn hàng
        order.status = status;
        await order.save();

        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// app.put('/orders/:id', async (req, res) => {
//     try {
//         const { customerId, address, phone, status } = req.body;

//         // Kiểm tra xem có dữ liệu cần cập nhật không
//         if (!customerId && !address && !phone && !status) {
//             return res.status(400).json({ error: 'No data provided to update' });
//         }

//         // Tìm đơn hàng theo ID
//         const order = await Order.findById(req.params.id).populate('customer');
//         if (!order) return res.status(404).json({ error: 'Order not found' });

//         let customer = order.customer;

//         // Kiểm tra và cập nhật thông tin khách hàng nếu customerId thay đổi
//         if (customerId && customerId !== customer._id.toString()) {
//             // Cập nhật thông tin khách hàng mới
//             customer = await Customer.findByIdAndUpdate(customerId, { address, phone }, { new: true });
//         } else if (address || phone) {
//             // Cập nhật thông tin khách hàng hiện tại nếu có thay đổi địa chỉ hoặc số điện thoại
//             customer = await Customer.findByIdAndUpdate(customer._id, { address, phone }, { new: true });
//         }

//         // Cập nhật trạng thái đơn hàng
//         const updatedOrder = await Order.findByIdAndUpdate(
//             req.params.id,
//             { status, customer: customer._id },
//             { new: true }
//         );

//         // Trả về đơn hàng đã cập nhật
//         res.json(updatedOrder);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

app.put('/orders/:id', async (req, res) => {
    try {
        const { address, phone, status, customer } = req.body;

        // Tìm đơn hàng theo ID
        const order = await Order.findById(req.params.id).populate('customer');
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Kiểm tra và cập nhật thông tin khách hàng nếu cần
        if (customer) {
            // Cập nhật thông tin khách hàng
            const updatedCustomer = await Customer.findByIdAndUpdate(
                customer,  // Cập nhật khách hàng bằng _id
                { address, phone },  // Cập nhật địa chỉ và số điện thoại
                { new: true }  // Trả về khách hàng đã được cập nhật
            );
            if (!updatedCustomer) {
                return res.status(404).json({ error: 'Customer not found' });
            }
        }

        // Cập nhật đơn hàng
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status,
                address,  // Cập nhật địa chỉ trong đơn hàng
                phone,    // Cập nhật số điện thoại trong đơn hàng
                customer  // Cập nhật _id của khách hàng trong đơn hàng
            },
            { new: true }  // Trả về đơn hàng đã được cập nhật
        );

        res.json(updatedOrder);  // Trả về đơn hàng đã cập nhật
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.delete('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Kiểm tra xem sản phẩm có tồn tại trong đơn hàng hay không
app.get('/orders/contains-product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const orders = await Order.find({ 'products.productId': productId });

        if (orders.length > 0) {
            // Trả về thông tin các đơn hàng chứa sản phẩm này
            return res.status(200).json({
                message: 'Sản phẩm này đã được thêm vào đơn hàng.',
                orders: orders  // Trả về danh sách các đơn hàng
            });
        }

        res.status(200).json({ message: 'Sản phẩm có thể xóa.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi kiểm tra sản phẩm trong đơn hàng.', error });
    }
});

 

// 1. Thống kê số lượng sản phẩm theo từng loại
app.get('/statistics/products-by-category', async (req, res) => {
    try {
        const stats = await Product.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Tổng doanh thu từ tất cả các đơn hàng
app.get('/statistics/total-revenue', async (req, res) => {
    try {
        const revenue = await Order.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
        ]);
        res.json(revenue[0] || { totalRevenue: 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Thống kê số lượng đơn hàng theo trạng thái
app.get('/statistics/orders-by-status', async (req, res) => {
    try {
        const stats = await Order.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. Danh sách khách hàng với tổng giá trị đơn hàng đã mua
// Danh sách khách hàng với tổng giá trị và số lượng sản phẩm đã mua
app.get('/statistics/customers-total-orders', async (req, res) => {
    try {
        const stats = await Order.aggregate([
            { $unwind: "$products" }, // Tách từng sản phẩm trong đơn hàng
            {
                $group: {
                    _id: "$customer", // Nhóm theo khách hàng
                    totalSpent: { $sum: "$totalPrice" }, // Tổng tiền đã chi
                    totalProducts: { $sum: "$products.quantity" } // Tổng sản phẩm đã mua
                }
            },
            {
                $lookup: {
                    from: "customers", // Kết nối với collection customers
                    localField: "_id",
                    foreignField: "_id",
                    as: "customerDetails"
                }
            },
            { $unwind: "$customerDetails" }, // Lấy chi tiết khách hàng
            {
                $project: {
                    _id: 0,
                    customer: "$customerDetails.name",
                    totalSpent: 1,
                    totalProducts: 1
                }
            }
        ]);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// 5. Thống kê các sản phẩm bán chạy nhất
app.get('/statistics/top-selling-products', async (req, res) => {
    try {
        const stats = await Order.aggregate([
            { $unwind: "$products" },
            { $group: { _id: "$products.productId", totalSold: { $sum: "$products.quantity" } } },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            { $project: { _id: 0, product: "$productDetails.name", totalSold: 1 } },
            { $sort: { totalSold: -1 } }
        ]);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. Thống kê tổng số lượng sản phẩm còn tồn kho
app.get('/statistics/total-stock', async (req, res) => {
    try {
        // Lấy tổng số lượng tồn kho
        const totalStock = await Product.aggregate([
            { $group: { _id: null, totalStock: { $sum: "$stock" } } }
        ]);

        // Lấy số lượng tồn kho của từng sản phẩm
        const productStock = await Product.aggregate([
            {
                $project: {
                    name: 1, // Lấy tên sản phẩm
                    stock: 1, // Lấy số lượng tồn kho của sản phẩm
                }
            }
        ]);

        // Trả về cả tổng số lượng tồn kho và số lượng tồn kho của từng sản phẩm
        res.json({
            totalStock: totalStock[0]?.totalStock || 0,
            productStock
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// 7. Thống kê doanh thu theo từng tháng
app.get('/statistics/monthly-revenue', async (req, res) => {
    try {
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalRevenue: { $sum: "$totalPrice" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
