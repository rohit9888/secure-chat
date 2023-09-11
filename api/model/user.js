const mongoose = require("mongoose")
const schema = mongoose.Schema
const Users = new schema({
    first_name: {
        type: String,
    },
    last_name:{
        type:String
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    password: {
        type: String,
     
    },
    confirmpassword:{
        type:String,
    },
    pic:{
       type:String,
       default:"https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__480.png"
    },
    role:{
        type: Number,
    },
    hash_transaction:{
        type:String
    },
    otp:{
        type:Number
    },
    verifiy:{
        type:Number,
        default:0
    },
    is_delete:{
        type:Boolean,
        default:false
    },
    orgName:{
        type:String
    },
    userName:{
        type:String
    }
    
}, {timestamps:true, strict: false });
var User = mongoose.model("Users", Users)
module.exports = User