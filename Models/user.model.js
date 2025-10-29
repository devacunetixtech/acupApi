const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {type: String, required: true, minlength: 3, maxlength: 30},
        email: {type: String, required: true, minlength: 3, maxlength: 100, unique: true},
        password: {type: String, required: true, minlength: 3, maxlength: 1024},
        phoneNo: Number,
        accountNumber: { type: String, unique: true },
        balance: { type: Number, default: 10000 },
        tranPin: { type: String, default: null }
    },{
        timestamps:true,
    }
);


module.exports = mongoose.model('AuthUser', userSchema);