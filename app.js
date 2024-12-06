// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');


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
mongoose.connect('mongodb+srv://ngophuc2911:phuc29112003@cluster0.xsf5v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
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
        const { customerId, products, address, phone, note, totalPrice } = req.body;

        const order = new Order({
            customer: customerId,
            products,
            address,
            phone,
            note,
            totalPrice,
        });

        // Save order
        await order.save();

        // Add order to customer
        await Customer.findByIdAndUpdate(customerId, { $push: { orders: order._id } });

        // Gửi email xác nhận đơn hàng
        const customer = await Customer.findById(customerId);
        const productDetails = await Promise.all(products.map(async item => {
            const product = await Product.findById(item.productId);
            return `- ${product.name}: ${item.quantity} x ${product.price} VND`;
        }));
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: customer.email,
            subject: 'Xác nhận đơn hàng',
            text: `Cảm ơn bạn đã đặt hàng!\n\nĐơn hàng của bạn đã được xác nhận.\n\nThông tin đơn hàng:\n${productDetails.join('\n')}\n\nTổng tiền: ${totalPrice} VND.`
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

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
