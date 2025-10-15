const userModel = require("../Models/user.model")
const transactionModel = require("../Models/transaction.model");
const nodemailer = require("nodemailer");
//NPM I BCRYPT VALIDATOR JSONWEBTOKEN
const bcrypt = require("bcrypt");
const validator = require("validator");
const jwt = require("jsonwebtoken");
// const axios = require("axios");
require("dotenv").config();
const mongoose = require('mongoose');


const createToken = (_id) => {
  const jwtkey = process.env.JWT_SECRET_KEY;

  return jwt.sign({ _id }, jwtkey, { expiresIn: "1d" });
};
// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to generate unique account number
const generateAcctNo = async () => {
  const prefix = 'ACUP';
  let accountNumber;
  let isUnique = false;

  while (!isUnique) {
    const randomNum = Math.floor(1000000000 + Math.random() * 9000000000); // Random 10-digit number
    accountNumber = `${prefix}${randomNum}`;
    const existingUser = await userModel.findOne({ accountNumber });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return accountNumber;
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNo } = req.body
    //Check if user exists
    let user = await userModel.findOne({ email });
    if (user)
      return res.status(400).json("This User Joined already ....");
    if (!name || !email || !password || !phoneNo)
      return res.status(400).json("All fields are required....")
    if (!validator.isEmail(email))
      return res.status(400).json("Email must be a valid email")
    if (!validator.isStrongPassword(password))
      return res.status(400).json("Password must be a strong one")

    // Generate unique account number
    const accountNumber = await generateAcctNo();
    //SAVING THE USER
    user = new userModel({ name, email, password, phoneNo, accountNumber });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    await user.save();

    console.log('User saved:', email, 'Account Number:', accountNumber);// Debug log
    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: [email, 'davidexcel2304@gmail.com'],
      subject: 'Welcome to Our Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #28a745; text-align: center; padding: 30px; border: 2px solid #28a745; border-radius: 8px; background-color: #e6ffed; width: fit-content; margin: 0 auto;">
          <h2 style="margin: 0; font-size: 24px;">Success!</h2>
          <p style="margin: 10px 0 0; font-size: 16px;">You are successfully registered, ${name}! Welcome aboard! You can now sign in to your account.</p>
          <p style="margin: 10px 0 0; font-size: 16px;">Your Account Number: <strong>${accountNumber}</strong></p>
          <a href="http://localhost:9064/api/user/signin" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 4px; font-size: 16px;">Sign In</a>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
          <p>This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to:', email);
    const token = createToken(user._id)
    res.status(200).json({ _id: user._id, name, email, accountNumber, token })
  } catch (error) {
    console.log(error)
    res.status(500).json(error);
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {

    let user = await userModel.findOne({ email });
    if (!user)
      return res.status(400).json({message: "Email is not registered...."});

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword)
      return res.status(400).json({message :"Incorrect password...."});

    const token = createToken(user._id)
    console.log("Generated JWT: ", token)
    res.status(200).json({
      message:"Login Successful",
      user:{
        _id: user._id, name: user.name, email, balance:user.balance, accountNumber: user.accountNumber, token 
      }
    })
  } catch (error) {
    console.log(error)
    res.status(500).json(error);
  }

};

const getDashboard = async (req, res) => {
  try {
    // 1. Get token from headers (usually sent as "Authorization: Bearer <token>")
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // 3. Find user
    const user = await userModel.findById(decoded._id).select("-password"); // exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 4. Return dashboard data
    res.status(200).json({
      message: "Welcome to your dashboard 🚀",
      user
    });
  } catch (error) {
    console.error("Dashboard error:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};


const findUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await userModel.findById(userId)
    res.status(200).json(user);
  } catch (error) {
    console.log(error)
    res.status(500).json(error);
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user._id;
    const { filter = "all", limit = 0, sort = "desc" } = req.query;

    // Build query based on filter
    let query = {};
    if (filter === "sent") {
      query = { sender: userId };
    } else if (filter === "received") {
      query = { receiver: userId };
    } else {
      query = { $or: [{ sender: userId }, { receiver: userId }] };
    }

    // Get total count of transactions
    const totalCount = await transactionModel.countDocuments(query);

    // Get transactions with limit and sort
    const transactions = await transactionModel
      .find(query)
      .populate("sender", "email name accountNumber")
      .populate("receiver", "email name accountNumber")
      .select("sender receiver amount description status createdAt transactionRef")
      .sort({ createdAt: sort === "desc" ? -1 : 1 })
      .limit(parseInt(limit) || 0);

    res.status(200).json({ transactions, totalCount });
  } catch (error) {
    console.error("Transaction history error:", error.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

// controllers/userController.js (partial)
const generateTransactionRef = async () => {
  const prefix = 'TXN';
  let ref;
  let isUnique = false;

  while (!isUnique) {
    const randomNum = Math.floor(100000000000 + Math.random() * 900000000000);
    ref = `${prefix}${randomNum}`;
    const existingTransaction = await transactionModel.findOne({ transactionRef: ref });
    if (!existingTransaction) {
      isUnique = true;
    }
  }
  return ref;
};

const setTranPin = async (req, res) =>{
  try {
    const { tranPin } = req.body;
    if (!tranPin || !/^\d{4}$/.test(tranPin)) {
      return res.status(400).json({ error: "Transaction PIN must be a 4-digit number" });
    }
    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const salt = await bcrypt.genSalt(10);
    user.tranPin = await bcrypt.hash(tranPin, salt);
    await user.save();
    res.status(200).json({ message: "Transaction PIN set successfully" });
  } catch (error) {
    console.error("Set Transaction PIN error:", error.message);
    res.status(500).json({ error: "Failed to set transaction PIN" });
  }
}

const getRecipientName = async (req, res) => {
  try {
    const { accountNumber } = req.body;
    if (!accountNumber) {
      return res.status(400).json({ error: "Account number is required" });
    }
    const recipient = await userModel.findOne({ accountNumber }, "name");
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }
    res.status(200).json({ name: recipient.name });
  } catch (error) {
    console.error("Get recipient name error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

const createTransfer = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { amount, toAccountNumber, tranDescription, tranPin } = req.body;
    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Validate input
    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Amount must be at least 1" });
    }
    if (!toAccountNumber) {
      return res.status(400).json({ error: "Account is required" });
    }
    if (!tranDescription) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!tranPin || !/^\d{4}$/.test(tranPin)) {
      return res.status(400).json({ error: "Transaction PIN must be a 4-digit number" });
    }

    // Validate PIN
    if (!user.tranPin) {
      return res.status(400).json({ error: "Transaction PIN not set. Please set it in your profile." });
    }
    const isPinValid = await bcrypt.compare(tranPin, user.tranPin);
    if (!isPinValid) {
      return res.status(400).json({ error: "Invalid transaction PIN" });
    }

    // Handle balances
    if (toAccountNumber === user.accountNumber) {
      return res.status(400).json({ error: "Cannot transfer to your own account" });
    }

    const recipient = await userModel.findOne({ accountNumber: toAccountNumber });
    if (!recipient) return res.status(404).json({ error: "Recipient not found" });

    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Declare transaction variable
    let transaction;

    // Use a database transaction for atomicity
    const session = await userModel.startSession();
    session.startTransaction();
    try {
      user.balance -= amount;
      recipient.balance = (recipient.balance || 0) + amount;
      await user.save({ session });
      await recipient.save({ session });

      // Create and save transaction
      const transactionRef = await generateTransactionRef();
      transaction = new transactionModel({
        sender: user._id,
        receiver: recipient._id,
        amount,
        toAccountNumber,
        transactionRef,
        description: tranDescription,
        status: "completed",
      });

      await transaction.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Send emails (non-critical)
    try {
      const senderMailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Transaction Confirmation: Transfer",
        html: `
          <div style="font-family: Arial, sans-serif; color: #28a745; text-align: center; padding: 30px;">
            <h2>Transfer Successful</h2>
            <p>Amount: $${amount}</p>
            <p>To: ${toAccountNumber}</p>
            <p>Transaction Reference: ${transaction.transactionRef}</p>
            <p>New Balance: $${user.balance}</p>
          </div>
        `,
      };
      await transporter.sendMail(senderMailOptions);

      const recipientMailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject: "You Received a Transfer",
        html: `
          <div style="font-family: Arial, sans-serif; color: #28a745; text-align: center; padding: 30px;">
            <h2>Transfer Received</h2>
            <p>From: ${user.accountNumber} (${user.name})</p>
            <p>Amount: $${amount}</p>
            <p>Transaction Reference: ${transaction.transactionRef}</p>
            <p>New Balance: $${recipient.balance}</p>
          </div>
        `,
      };
      await transporter.sendMail(recipientMailOptions);
    } catch (emailError) {
      console.error("Email sending error:", emailError.message);
    }

    // Populate transaction for response
    const populatedTransaction = await transactionModel
      .findById(transaction._id)
      .populate("sender", "email name accountNumber")
      .populate("receiver", "email name accountNumber");

    // Respond to client
    res.status(200).json({
      message: "Transfer successful",
      transaction: populatedTransaction,
      balance: user.balance,
    });
  } catch (error) {
    console.error("Transfer error:", error.message);
    res.status(500).json({ error: error.message });
  }
};


module.exports = { registerUser, loginUser, getDashboard, findUser, getTransactionHistory, createTransfer, setTranPin, getRecipientName };