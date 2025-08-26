"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.login = exports.register = void 0;
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        // Check if user already exists
        const existingUser = await User_1.UserModel.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const existingEmail = await User_1.UserModel.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        // Create new user
        const user = await User_1.UserModel.create({ username, email, password });
        // Generate token
        const token = (0, auth_1.generateToken)(user.id);
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        // Find user
        const user = await User_1.UserModel.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Verify password
        const isValidPassword = await User_1.UserModel.verifyPassword(user, password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate token
        const token = (0, auth_1.generateToken)(user.id);
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const logout = async (req, res) => {
    // Since we're using JWT, the client should discard the token
    // The server doesn't need to do anything for logout
    res.json({ message: 'Logout successful' });
};
exports.logout = logout;
//# sourceMappingURL=authController.js.map