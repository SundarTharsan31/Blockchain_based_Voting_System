const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        institutionId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        role: {
            type: String,
            required: true,
            enum: ["STUDENT", "TEACHER", "ADMIN", "AUDITOR", "VALIDATOR"]
        },

        department: {
            type: String,
            trim: true
        },

        year: {
            type: Number
        },

        section: {
            type: String,
            trim: true
        },

        walletAddress: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },

        identityHash: {
            type: String,
            unique: true,
            sparse: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);