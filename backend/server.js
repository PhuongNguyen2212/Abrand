const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const mysql = require('mysql2/promise');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, "Uploads");
const ALLOWED_BRANDS = ["Cartier", "Bvlgari", "Van Cleef & Arpels", "Chrome Hearts", "GKH Jewelry"];
const ALLOWED_TYPES = ["Ring", "Necklace", "Bracelet", "Collar", "Earring"];
const ALLOWED_MATERIALS = ["Vàng 10k", "Vàng 18k", "Bạc", "Bạch kim"];

// MySQL connection pool
let dbPool;

async function initializeDatabase() {
    try {
        dbPool = await mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'jewelry_store',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Create products table if it doesn't exist
        await dbPool.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(10) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                brand VARCHAR(50) NOT NULL,
                type VARCHAR(50) NOT NULL,
                imageUrl1 VARCHAR(255),
                imageUrl2 VARCHAR(255),
                imageUrl3 VARCHAR(255),
                imageUrl4 VARCHAR(255),
                mainImageIndex TINYINT DEFAULT 0,
                originalPrice DECIMAL(10, 2) NOT NULL,
                salePrice DECIMAL(10, 2) NOT NULL,
                material VARCHAR(50) NOT NULL,
                description TEXT,
                version INT DEFAULT 0
            )
        `);     

        console.log("Database initialized successfully");
    } catch (err) {
        console.error("Error initializing database:", err);
        throw err;
    }
}

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use("/backend/uploads", express.static(UPLOADS_DIR, {
    setHeaders: (res, filePath) => {
        console.log(`Serving file: ${filePath}`);
        res.set('Cache-Control', 'public, max-age=31536000');
    }
}));
app.use(express.static(path.join(__dirname, "public")));

// Serve favicon
app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    res.sendFile(faviconPath, (err) => {
        if (err) {
            console.warn('Favicon not found:', faviconPath);
            res.status(204).end();
        }
    });
});

// Multer storage configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            await fs.chmod(UPLOADS_DIR, 0o755);
            cb(null, UPLOADS_DIR);
        } catch (err) {
            console.error("Error creating uploads directory:", err);
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        try {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname).toLowerCase();
            const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
            cb(null, filename);
            console.log("Generated filename:", filename);
        } catch (err) {
            console.error("Error setting filename:", err);
            cb(err);
        }
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(jpeg|jpg|png)$/i;
        const allowedMimetypes = ['image/jpeg', 'image/png'];
        const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedMimetypes.includes(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only jpg, jpeg, and png files are allowed'), false);
    },
    limits: { fileSize: 25 * 1024 * 1024 }
}).array("images", 4);

const optionalUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(jpg|jpeg|png)$/i;
        const allowedMimetypes = ['image/jpeg', 'image/png'];
        const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedMimetypes.includes(file.mimetype);

        console.log('File details (optional upload):', {
            originalName: file.originalname,
            extname,
            mimetype,
            mimeValue: file.mimetype
        });

        if (extname && mimetype) {
            console.log('File filter: Valid file', { name: file.originalname, type: file.mimetype });
            return cb(null, true);
        }

        console.warn('File filter: Invalid file type, skipping upload', { name: file.originalname, type: file.mimetype });
        cb(null, false);
    },
    limits: { fileSize: 25 * 1024 * 1024 }
}).array("images", 4);

// JWT verification middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log("Token verification: No token provided");
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.userId) {
            console.error("Token verification: Missing userId in token payload");
            return res.status(401).json({ message: "Invalid token: missing userId" });
        }
        req.user = decoded;
        console.log("Token verified, user:", req.user);
        next();
    } catch (err) {
        console.error("Token verification error:", err.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

async function generateProductCode(type, brand) {
    if (!type || !brand || typeof type !== "string" || typeof brand !== "string") {
        console.error("Invalid type or brand:", { type, brand });
        throw new Error("Type and brand must be non-empty strings");
    }
    const prefix = `${type.trim().charAt(0).toUpperCase()}${brand.trim().charAt(0).toUpperCase()}`.trim();
    try {
        const [rows] = await dbPool.execute(
            'SELECT id FROM products WHERE id LIKE ?',
            [`${prefix}%`]
        );
        const numbers = rows
            .map(row => {
                const numberPart = row.id.replace(prefix, "").trim();
                const number = parseInt(numberPart, 10);
                return isNaN(number) || number < 0 ? null : number;
            })
            .filter(num => num !== null);
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        const newNumber = maxNumber + 1;
        const newCode = `${prefix}${newNumber.toString().padStart(4, "0")}`;
        const [existing] = await dbPool.execute('SELECT id FROM products WHERE id = ?', [newCode]);
        if (existing.length > 0) {
            console.warn("Duplicate ID detected, regenerating:", newCode);
            return generateProductCode(type, brand);
        }
        return newCode;
    } catch (err) {
        console.error("Error generating product code:", err);
        throw err;
    }
}

// Login route
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt:", { username });
    if (
        username !== process.env.ADMIN_USERNAME ||
        !(await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH))
    ) {
        console.log("Login failed: Invalid credentials");
        return res.status(401).json({ message: "Invalid username or password" });
    }
    const userId = username;
    const token = jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: "1h" });
    console.log("Login successful:", { username, userId });
    res.json({ success: true, token });
});

// Get all products with filtering
app.get("/api/products", async (req, res) => {
    try {
        const { brand, type } = req.query;
        console.log("Fetching products with query:", { brand, type });

        let query = 'SELECT id, name, brand, type, imageUrl1, imageUrl2, imageUrl3, imageUrl4, mainImageIndex, originalPrice, salePrice, material, description, version FROM products';
        const queryParams = [];
        const conditions = [];

        if (brand && brand !== 'all' && ALLOWED_BRANDS.includes(brand)) {
            conditions.push('LOWER(brand) = ?');
            queryParams.push(brand.toLowerCase());
        } else if (brand && !ALLOWED_BRANDS.includes(brand)) {
            console.warn("Invalid brand filter:", brand);
            return res.status(400).json({ message: `Invalid brand: "${brand}". Must be one of: ${ALLOWED_BRANDS.join(", ")}` });
        }

        if (type && type !== 'all' && ALLOWED_TYPES.includes(type)) {
            conditions.push('LOWER(type) = ?');
            queryParams.push(type.toLowerCase());
        } else if (type && !ALLOWED_TYPES.includes(type)) {
            console.warn("Invalid type filter:", type);
            return res.status(400).json({ message: `Invalid type: "${type}". Must be one of: ${ALLOWED_TYPES.join(", ")}` });
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const [rows] = await dbPool.execute(query, queryParams);
        const formattedRows = rows.map(row => ({
            ...row,
            imageUrls: [row.imageUrl1, row.imageUrl2, row.imageUrl3, row.imageUrl4].filter(url => url)
        }));
        console.log(`Returning ${formattedRows.length} products`);
        res.json(formattedRows);
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ message: "Error fetching products" });
    }
});

// Add a new product
app.post("/api/products", verifyToken, upload, async (req, res) => {
    try {
        const { name, brand, type, originalPrice, salePrice, material, description, mainImageIndex } = req.body;
        console.log("Received product data:", {
            name,
            brand,
            type,
            originalPrice,
            salePrice,
            material,
            description,
            mainImageIndex,
            images: req.files ? req.files.map(f => f.originalname) : "No images"
        });

        // Input validation
        if (!name || !brand || !type || !originalPrice || !salePrice || !material) {
            console.log("Validation failed: Missing required fields");
            return res.status(400).json({ message: "All fields are required, including material" });
        }

        const normalizedName = name.trim();
        const normalizedBrand = brand.trim();
        const normalizedType = type.trim();
        const normalizedMaterial = material.trim();
        const normalizedDescription = description ? description.trim() : null;
        const parsedMainImageIndex = parseInt(mainImageIndex) || 0;

        if (!normalizedName) {
            console.log("Validation failed: Name cannot be empty");
            return res.status(400).json({ message: "Product name cannot be empty" });
        }

        if (!ALLOWED_BRANDS.includes(normalizedBrand)) {
            console.log("Validation failed: Invalid brand", normalizedBrand);
            return res.status(400).json({ message: `Invalid brand: "${brand}". Must be one of: ${ALLOWED_BRANDS.join(", ")}` });
        }
        if (!ALLOWED_TYPES.includes(normalizedType)) {
            console.log("Validation failed: Invalid type", normalizedType);
            return res.status(400).json({ message: `Invalid type: "${type}". Must be one of: ${ALLOWED_TYPES.join(", ")}` });
        }
        if (!ALLOWED_MATERIALS.includes(normalizedMaterial)) {
            console.log("Validation failed: Invalid material", normalizedMaterial);
            return res.status(400).json({ message: `Invalid material: "${material}". Must be one of: ${ALLOWED_MATERIALS.join(", ")}` });
        }

        const parsedOriginalPrice = parseFloat(originalPrice);
        const parsedSalePrice = parseFloat(salePrice);

        if (
            isNaN(parsedOriginalPrice) || parsedOriginalPrice < 0 ||
            isNaN(parsedSalePrice) || parsedSalePrice < 0
        ) {
            console.log("Validation failed: Invalid numeric fields");
            return res.status(400).json({ message: "Original price and sale price must be valid non-negative numbers" });
        }

        if (!req.files || req.files.length === 0) {
            console.log("Validation failed: No images provided");
            return res.status(400).json({ message: "At least one image is required" });
        }

        if (parsedMainImageIndex < 0 || parsedMainImageIndex >= req.files.length) {
            console.log("Validation failed: Invalid main image index");
            return res.status(400).json({ message: `Main image index must be between 0 and ${req.files.length - 1}` });
        }

        // Handle images
        const imageUrls = Array(4).fill(null);
        for (let i = 0; i < req.files.length; i++) {
            imageUrls[i] = `/backend/uploads/${req.files[i].filename}`;
            await fs.chmod(path.join(UPLOADS_DIR, req.files[i].filename), 0o644);
            console.log("New image uploaded:", imageUrls[i]);
        }

        // Generate product ID and insert into database
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const newId = await generateProductCode(normalizedType, normalizedBrand);
            const newProduct = {
                id: newId,
                name: normalizedName,
                brand: normalizedBrand,
                type: normalizedType,
                imageUrl1: imageUrls[0],
                imageUrl2: imageUrls[1],
                imageUrl3: imageUrls[2],
                imageUrl4: imageUrls[3],
                mainImageIndex: parsedMainImageIndex,
                originalPrice: parsedOriginalPrice,
                salePrice: parsedSalePrice,
                material: normalizedMaterial,
                description: normalizedDescription,
                version: 0
            };

            await connection.execute(
                'INSERT INTO products (id, name, brand, type, imageUrl1, imageUrl2, imageUrl3, imageUrl4, mainImageIndex, originalPrice, salePrice, material, description, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    newProduct.id,
                    newProduct.name,
                    newProduct.brand,
                    newProduct.type,
                    newProduct.imageUrl1,
                    newProduct.imageUrl2,
                    newProduct.imageUrl3,
                    newProduct.imageUrl4,
                    newProduct.mainImageIndex,
                    newProduct.originalPrice,
                    newProduct.salePrice,
                    newProduct.material,
                    newProduct.description,
                    newProduct.version
                ]
            );

            await connection.commit();
            console.log("Product added successfully:", newProduct);
            res.status(201).json({
                ...newProduct,
                imageUrls: imageUrls.filter(url => url)
            });
        } catch (err) {
            await connection.rollback();
            if (req.files) {
                for (const file of req.files) {
                    await fs.unlink(path.join(UPLOADS_DIR, file.filename)).catch(e => console.error("Failed to delete temp file:", e));
                }
            }
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error("Error adding product:", err.message, err.stack);
        res.status(500).json({ message: err.message || "Error adding product" });
    }
});

// Update product
app.patch("/api/products/:id", verifyToken, optionalUpload, async (req, res) => {
    const { id } = req.params;
    const { name, brand, type, material, originalPrice, salePrice, description, version, keepImages, mainImageIndex } = req.body || {};
    console.log("Updating product:", { id, name, brand, type, material, originalPrice, salePrice, description, version, keepImages, mainImageIndex, files: req.files ? req.files.length : 0 });

    try {
        const updates = {};
        if (name !== undefined) {
            const trimmedName = name.trim();
            if (!trimmedName) return res.status(400).json({ message: "Name cannot be empty" });
            updates.name = trimmedName;
        }
        if (brand !== undefined) {
            if (!ALLOWED_BRANDS.includes(brand)) return res.status(400).json({ message: `Invalid brand: "${brand}". Must be one of: ${ALLOWED_BRANDS.join(", ")}` });
            updates.brand = brand;
        }
        if (type !== undefined) {
            if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ message: `Invalid type: "${type}". Must be one of: ${ALLOWED_TYPES.join(", ")}` });
            updates.type = type;
        }
        if (material !== undefined) {
            const normalizedMaterial = material.trim();
            if (!ALLOWED_MATERIALS.includes(normalizedMaterial)) {
                return res.status(400).json({ message: `Invalid material: "${material}". Must be one of: ${ALLOWED_MATERIALS.join(", ")}` });
            }
            updates.material = normalizedMaterial;
        }
        if (originalPrice !== undefined) {
            const parsedOriginalPrice = parseFloat(originalPrice);
            if (isNaN(parsedOriginalPrice) || parsedOriginalPrice <= 0) {
                return res.status(400).json({ message: "Invalid original price value" });
            }
            updates.originalPrice = parsedOriginalPrice;
        }
        if (salePrice !== undefined) {
            const parsedSalePrice = parseFloat(salePrice);
            if (isNaN(parsedSalePrice) || parsedSalePrice < 0) {
                return res.status(400).json({ message: "Invalid sale price value" });
            }
            updates.salePrice = parsedSalePrice;
        }
        if (description !== undefined) {
            updates.description = description ? description.trim() : null;
        }
        if (mainImageIndex !== undefined) {
            const parsedMainImageIndex = parseInt(mainImageIndex);
            if (isNaN(parsedMainImageIndex) || parsedMainImageIndex < 0 || parsedMainImageIndex > 3) {
                return res.status(400).json({ message: "Main image index must be between 0 and 3" });
            }
            updates.mainImageIndex = parsedMainImageIndex;
        }

        let imageUrls = Array(4).fill(null);
        if (req.files && req.files.length > 0) {
            if (req.files.length > 4) {
                return res.status(400).json({ message: "Maximum 4 images allowed" });
            }
            for (let i = 0; i < req.files.length; i++) {
                imageUrls[i] = `/backend/uploads/${req.files[i].filename}`;
                await fs.chmod(path.join(UPLOADS_DIR, req.files[i].filename), 0o644);
            }
            updates.imageUrl1 = imageUrls[0];
            updates.imageUrl2 = imageUrls[1];
            updates.imageUrl3 = imageUrls[2];
            updates.imageUrl4 = imageUrls[3];
        } else if (keepImages !== "true" && (!req.files || req.files.length === 0)) {
            return res.status(400).json({ message: "New images are required unless keepImages is true" });
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Fetch current product
            const [rows] = await connection.execute('SELECT * FROM products WHERE id = ?', [id.trim()]);
            if (rows.length === 0) {
                return res.status(404).json({ message: `Product with ID ${id} not found` });
            }
            const currentProduct = rows[0];

            if (version !== undefined && parseInt(version) !== currentProduct.version) {
                return res.status(409).json({ message: "Product was modified by another user" });
            }

            // Delete old images if new ones are provided
            if (req.files && req.files.length > 0) {
                const oldImageUrls = [currentProduct.imageUrl1, currentProduct.imageUrl2, currentProduct.imageUrl3, currentProduct.imageUrl4].filter(url => url);
                for (const oldImageUrl of oldImageUrls) {
                    const oldImagePath = path.join(__dirname, oldImageUrl);
                    try {
                        await fs.unlink(oldImagePath);
                        console.log("Deleted old image:", oldImagePath);
                    } catch (err) {
                        console.warn("Failed to delete old image:", err.message);
                    }
                }
            }

            updates.version = (currentProduct.version || 0) + 1;

            // Build update query
            const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(updates);
            updateValues.push(id.trim());

            await connection.execute(
                `UPDATE products SET ${updateFields} WHERE id = ?`,
                updateValues
            );

            // Fetch updated product
            const [updatedRows] = await connection.execute('SELECT * FROM products WHERE id = ?', [id.trim()]);
            await connection.commit();
            const updatedProduct = {
                ...updatedRows[0],
                imageUrls: [
                    updatedRows[0].imageUrl1,
                    updatedRows[0].imageUrl2,
                    updatedRows[0].imageUrl3,
                    updatedRows[0].imageUrl4
                ].filter(url => url)
            };
            console.log("Product updated successfully:", updatedProduct);
            res.json(updatedProduct);
        } catch (err) {
            await connection.rollback();
            if (req.files) {
                for (const file of req.files) {
                    await fs.unlink(path.join(UPLOADS_DIR, file.filename)).catch(e => console.error("Failed to delete temp file:", e));
                }
            }
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error("Error updating product:", { id, error: err.message, stack: err.stack });
        res.status(500).json({ message: err.message || "Error updating product" });
    }
});

// DELETE endpoint
app.delete("/api/products/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    console.log("Received DELETE request for product:", { id, type: typeof id });

    try {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Fetch product to get imageUrls
            const [rows] = await connection.execute('SELECT imageUrl1, imageUrl2, imageUrl3, imageUrl4 FROM products WHERE id = ?', [id.trim()]);
            if (rows.length === 0) {
                return res.status(404).json({ message: `Product with ID ${id} not found` });
            }
            const imageUrls = [rows[0].imageUrl1, rows[0].imageUrl2, rows[0].imageUrl3, rows[0].imageUrl4].filter(url => url);

            // Delete product
            const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [id.trim()]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: `Product with ID ${id} not found` });
            }

            // Delete associated images
            for (const imageUrl of imageUrls) {
                const imagePath = path.join(__dirname, imageUrl);
                try {
                    await fs.unlink(imagePath);
                    console.log("Deleted image:", imagePath);
                } catch (err) {
                    console.warn("Failed to delete image:", err.message);
                }
            }

            await connection.commit();
            res.json({ message: "Product deleted successfully" });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error("Error deleting product:", { id, error: err.message, stack: err.stack });
        res.status(500).json({ message: "Error deleting product", error: err.message });
    }
});

// Start server
app.listen(PORT, async () => {
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        await fs.chmod(UPLOADS_DIR, 0o755);
        await initializeDatabase();
        console.log(`Server running on http://localhost:${PORT}`);
    } catch (err) {
        console.error("Error starting server:", err);
        process.exit(1);
    }
});