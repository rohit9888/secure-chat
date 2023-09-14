
const User = require('../model/user');
const registerUser = require('../fabric/registerUser')
const invoke = require("../fabric/invoke")
var bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require("nodemailer")
var multer  = require('multer');
const sgMail = require("@sendgrid/mail");


async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}
function betweenRandomNumber(min, max) {  
    return Math.floor( Math.random() * (max - min + 1) + min )
}
async function validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

exports.signup = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            confirmpassword,
            orgName
        } = req.body
        var role = req.body.role       //client:1, broker:2, supervisor:3
        if (req.body.role == "Client") {
            role = 1;
        } if (req.body.role == "Broker") {
            role = 2;
        }
        if (req.body.role == "Supervisor") {
            role = 3;
        }

        if(first_name == undefined || first_name == ""){
        	return res.json({statusMsj:403,statusMsj:"please fill First Name"})
        }
        if(last_name == undefined || last_name == ""){
        	return res.json({statusMsj:403,statusMsj:"please fill Last Name"})
        }
        if(email == undefined || email == ""){
        	return res.json({statusMsj:403,statusMsj:"please fill Valid Email"})
        }
        if(password == undefined || password == ""){
        	return res.json({statusMsj:403,statusMsj:"please fill Password"})
        }
         if(confirmpassword == undefined || confirmpassword == ""){
        	return res.json({statusMsj:403,statusMsj:"please fill confirmpassword"})
        }
         if(role == undefined || role == ""){
        	return res.json({statusMsj:403,statusMsj:"please fill role"})
        }
        if (password != confirmpassword) {
            return res.json({ statusCode: 401, message: "Pasword Mismatch" })
        }

        var hash_transaction = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await hashPassword(password);

        var otp = betweenRandomNumber(1000, 9999)
        var UserData = await User.findOne({ email: req.body.email})

        if (UserData != null) {
            if(UserData.verifiy == 0){
                User.findOneAndUpdate({email: req.body.email},{$set:{otp:otp}},(err,updateOTP)=>{
                    if(err){
                        return res.json({statusCode:400,statusMsj:err});
                    }
                    else{
                        return res.json({statusCode:200,statusMsj:"Please verify your email",otp:"Your otp is ",otp,  _id:UserData._id});
                    }
                })
            }else if(UserData.verifiy == 1){
                return res.json({statusCode:400,statusMsj:"email already exist"})
            }
        }
        else{
            var userName = first_name+last_name
            var result = await registerUser.registerUser(userName, orgName, password)
           if(result.success == true){
   		 const newUser = new User({
			   first_name: first_name,
                    last_name: last_name,
                    userName:first_name+last_name,
                    email: email,
                    password: hashedPassword,
                    confirmpassword: confirmpassword,
                    role: role,
                    // pic: pic,
                    orgName:orgName,
                    hash_transaction: hash_transaction
                });
		
                newUser.set({'otp':otp})
              const savedata =  await  newUser.save()
            //    sgMail.setApiKey('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');
                // console.log("emailemail",email)
                // const msg = {
                //   to: email,
                //   from: 'divyachourasiya.infograins@gmail.com',
                //   subject: "Your OTP",
                //   text: 'Your Otp is',
                //   html: '<strong>'+otp+'</strong>',
                // };
                //  sgMail.send(msg,(err,data)=>{
                //   if(err){
                //       console.log({err})
                //   }
                //   else{
                //       console.log("mail send")
                //   }
                // });
                
               
                return res.json({ 
                    statusCode: 200, 
                    statusMsj: "Successfully registered and enrolled user " + userName + " and imported it into the wallet",
                    data: savedata })
            }else{
                return res.json({statusCode:400,statusMsj:result.message })
          }
        }

       
    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        return res.json({statusCode: 400, statusMsj: error.message})
    }
}


exports.emailVerify = async (req, res) => {
    var email = req.body.email
    var otp = Math.floor(Math.random() * 11111)

    var add_otp = await User.updateOne({ email: req.body.email }, { $set: { otp: otp } })
    
    sgMail.setApiKey('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');
    const msg = {
      to: email,
      from: 'divyachourasiya.infograins@gmail.com',
      subject: "Your OTP",
      text: 'Your Otp is',
      html: '<strong>'+otp+'</strong>',
    };
     sgMail.send(msg,(err,data)=>{
      if(err){
          console.log(err)
      }
    });

    // let transporter = nodemailer.createTransport(
    //     {
    //         service: "gmail",
    //         secure: false,
    //         auth: {
    //             user: "bulbul.infograins@gmail.com",
    //             pass: "BulBul@123"
    //         },
    //         tls: { rejectUnauthorized: false }
    //     }
    // );
    // let mailOptions = {
    //     from: email,
    //     to: email,
    //     subject: "Your OTP",
    //     html: "OTP - " + otp
    // };
    // transporter.sendMail(mailOptions, function (error) {
    //     if (error) {
    //         res.send(error);
    //         console.log(error);
    //     }
    //     else {
    //         console.log("Server is ready to take our statusMsjs");
    //         return res.json({ statusCode: 200, statusMsj: "mail send", otp: otp })

    //     }
    // });
}

exports.verify_email_otp = async (req, res) => {
   
    var otp = req.body.otp;
    var _id = req.body._id;
    const accessToken = jwt.sign({
        userId: _id
    }, 'bulbul', {
        expiresIn: "1d"
    });
    
    var user_data = await User.findById({ _id: _id })

    if (!user_data) {
        return res.json({ statusCode: 400, statusMsj: "Email Not found" })
    }

    if (user_data.otp == otp) {
        var verify = await User.updateOne({ _id: _id }, { $set: { verifiy: 1 , accessToken } })
        var data = await User.findById({ _id: _id })   
        return res.json({ statusCode: 200, statusMsj: "Email Verfication Successfully done", data: data })
    }

    if (user_data.otp != otp) {
        return res.json({ statusCode: 401, statusMsj: "Wrong OTP" })
    }
}

exports.updatePassword = async (req, res) => {
    var _id = req.body._id;
    var password = req.body.password
    var confirmpassword = req.body.confirmpassword

    const hashedPassword = await hashPassword(password);
    
    if(!password){
        return res.json({statusCode:402,statusMsj:"Password is Required" })
    }
    if(!confirmpassword){
        return res.json({statusCode:401,statusMsj:"Confirm Password is Required" })
    }
    
    if(password != confirmpassword){
        return res.json({statusCode:403,statusMsj:"Password Mistmatch" })
    }

    var data = await User.findOneAndUpdate({ _id:_id }, { $set: { password: hashedPassword, confirmpassword: password } })
    if (!data) {
        return res.json({ statusCode: 400, statusMsj: 'password not updated' })
    } else {
        return res.json({ statusCode: 200, statusMsj: "Password updated" })
    }

}

exports.changePassword = async (req, res) => {
  
    var _id=req.user._id;
    var oldPassword = req.body.oldPassword;
    var newPassword = req.body.newPassword;

    var data = await User.findOne({ _id: _id })

    const validOldPassword = await validatePassword(oldPassword, data.password);
    if (!validOldPassword) return res.json({ statusCode: 402, statusMsj: 'incorrect old password' })

    const hashedPassword = await hashPassword(newPassword);

    var result = await User.findOneAndUpdate({ _id: _id }, { $set: { password: hashedPassword, confirmpassword: newPassword } })
    if (!result) {
        return res.json({ statusCode: 400, statusMsj: "bad Request" })
    } else {
        return res.json({ statusCode: 200, statusMsj: "Password successfully change!" })
    }
}

exports.userslist = async (req, res) => {
    
    

// var users = await User.aggregate([
//   {$project: { "userName" : { $concat : [ "$firstName", " ", "$lastName" ] } }},
//   {$match: {"userName": {$regex: /bob j/i}}}
// ]).exec(function(err, result){
// });


    const keyword = req.query.search ? { first_name: { $regex: req.query.search, $options: "i" }, role: { $ne: 3 } } : {};
    
    
    // var keyword = req.query.search ? {"userName":{$concat:["$firstName",  "$lastName"]}, "userName":{ $regex: req.query.search.split(" ")[0]+ req.query.search.split(" ")[1], $options: "i" }, role:{$ne:3} }:{}
    const users = await User.find(keyword).find({ _id: { $ne: req.user._id }, role:{$ne:3}});
    if(users.length == 0){
        return res.json({statusCode:400,statusMsj:"User not available"})
    }else{
        return res.json({ statusCode: 200, statusMsj: "User List",users:users })
    }
}

exports.getUser = async (req, res) => {
    User.findById({ _id: req.body.id })
        .then((result) => {
            if (!result) {
                return res.json({ statusCode: 400, statusMsj: "Data Not Found" })
            }
            return res.json({ statusCode: 200, data: result })
        }).catch((err) => {
            console.log(err)
            return res.json({ statusCode: 500, statusMsj: "Something went wrong" })
        })
}

exports.forgotPassword = async (req, res) => {
    var email = req.body.email
    var otp =betweenRandomNumber(1000, 9999)
    var data = await User.findOne({ email: req.body.email })
    if(!data){
        return res.json({statusCode:400, statusMsj:"Email does Not Exist"})
    }
    var add_otp = await User.findOneAndUpdate({ email: req.body.email }, { $set: { otp: otp } })
    
    sgMail.setApiKey('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');
    const msg = {
      to: email,
      from: 'divyachourasiya.infograins@gmail.com',
      subject: "Your OTP",
      text: 'Your Otp is',
      html: '<strong>'+otp+'</strong>',
    };
     sgMail.send(msg,(err,data)=>{
      if(err){
          console.log(err)
          return res.send(error);
      }
      else{
           return res.json({ statusCode:200,statusMsj:"mail send", otp:otp,UserId:add_otp._id})
      }
    });

    // var smtpTransport = nodemailer.createTransport({
    //     host :'smtp.gmail.com',
    //     secureConnection :false,
    //     port:587,
    //     auth : {
    //         user: "bulbul.infograins@gmail.com",
    //         pass: "BulBul@123"    
    //     }
    // });
    // var mailOptionsNoAttachment={
    //     from:"bulbul.infograins@gmail.com",
    //     to : email,
    //     subject : "Your OTP" ,
    //     html: "OTP - " + otp
    // }
    // smtpTransport.sendMail(mailOptionsNoAttachment, function(error, response){
    //     if(error){
    //         return res.send(error);
            
    //     }
    //     else{
    //         return res.json({ statusCode:200,statusMsj:"mail send", otp:otp,UserId:add_otp._id})
    //     }
    // });
}

exports.verify_otp = async (req, res) => {
    var otp = req.body.otp;
    var _id = req.body._id;

    var user_data = await User.findOne({ _id: _id })

    if (!user_data) {
        return res.json({ statusCode: 400, statusMsj: "Email Not found" })
    }
    if (user_data.otp != otp) {
        return res.json({ statusCode: 401, statusMsj: "Wrong OTP" })
    } return res.json({statusCode: 200, statusMsj: "Verification successfully" })
}

exports.getUserById = async (req, res) => {
    User.find({ is_delete: false, role: 1, role: 2 }).then((result) => {
        if (!result) {
            return res.json({ statusCode: 400, statusMsj: "Data Not Found" })
        }
        return res.json({ statusCode: 200, data: result })
    }).catch((err) => {
        return res.json({ statusCode: 500, statusMsj: "Something went wrong" })
    })
}

exports.updateUser = async (req, res) => {
    var userId = req.query._id
    // var first_name = req.body.first_name;
    // var last_name = req.body.last_name;
    // var pic = req.body.pic;
    
    var updateData = {}
    
    if(req.body.first_name){
        updateData.first_name = req.body.first_name
    }
    
     if(req.body.last_name){
        updateData.last_name = req.body.last_name
    }
    
     if(req.body.pic){
        updateData.pic = req.body.pic
    }
    
    var data = await User.findOneAndUpdate({ _id: userId }, { $set: updateData })

    // var data = await User.findOneAndUpdate({ _id: userId }, { $set: { first_name: first_name, last_name: last_name, pic: pic } })
    if (!data) {
        return res.json({ statusCode: 400, statusMsj: "User Not found", })
    } else {
        return res.json({ statusCode: 200, statusMsj: "profile updated successfully" })
    }
}

exports.userlogin = async (req, res, next) => {
    try {
        const {
            email,
            password,
            role
        } = req.body;
    
        if(email == undefined || email == ""){
        	return res.json({statusMsj:403,statusMsj:"please fill Valid Email"})
        }
         if(password == undefined || password == ""){
        	return res.json({statusMsj:403,statusMsj:"please Enter your Password"})
        }
         if(role == undefined || role == ""){
        	return res.json({statusMsj:403,statusMsj:"please Enter your Role"})
        }
        const user = await User.findOne({ email });


        if (!user) return res.json({ statusCode: 401, statusMsj: 'Email does not exist!' });
        
        if(user.verifiy == 0){
            return res.json({statusCode: 203, statusMsj:"Please verify your email"})
        }
        if (!role) return res.json({ statusCode: 401, statusMsj: "Role Required" })

        if (user.role != role) {
            return res.json({ statusCode: 403, statusMsj: "Incorrect Role" })
        }
        const validPassword = await validatePassword(password, user.password);
        if (!validPassword) return res.json({ statusCode: 402, statusMsj: 'Password is not correct' })

        const accessToken = jwt.sign({
            userId: user._id
        }, 'bulbul', {
            expiresIn: "1d"
        });
        await User.findByIdAndUpdate(user._id, {
            accessToken
        })
        var userName = user.userName
        var channelName = "mychannel"
        var chaincodeName = "chat-app"
        var functionName = "InitLedger"
        var args=[]
        var result = await invoke.invokeChaincode(userName, channelName, chaincodeName, functionName, args)
        if(result.success == true){
            return res.json(
                {statusCode: 200, 
                statusMsj: "Transaction has been submitted successfully",
                chaincodeResponse:result.chaincodeResponse,
                accessToken:accessToken,
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                pic: user.pic
                
            })
        }else{
            return res.json(
                {statusCode: 400, 
                statusMsj: result.message,
            })
        }
    } catch (error) {
        // return res.json({ statusCode: 500, statusMsj: "login failed" })
        console.error(`Failed to submit transaction: ${error}`);
        return res.json({statusCode: 500, statusMsj: error.message})
    }
}



const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./images");
    },
    filename: (req, file, cb) => {
            var extensionsGet = file.originalname;
            extensionsGet = extensionsGet.split('.');
            extensionsGet = extensionsGet[1];

            if(extensionsGet === "png" ||extensionsGet === "jpg" ||extensionsGet === "jpeg"){
                if(file){
                    cb(null, file.originalname.replace(/ /g, ""))
                }
            }
            else{
                cb({
                    statusCode:403,
                    statusMsj:file.originalname+" Image Not saported. Upload valid image"
                });
            }
    }
});
const upload = multer({storage: storage}).single('image');

exports.uploadImage = async(req, res)=>{
    upload (req, res, err =>{
        
        if(req.file == undefined || req.file == null){
            return res.json({statusCode:403, statusMsj: "pleas select image"})
        }
        if(err){
            return res.json({statusCode:200, statusMsj: err});
        }
        else{
            var BASE_URL = "http://148.72.244.170:3000/images/"
            User.updateOne({_id:req.user._id}, {$set:{pic:BASE_URL+req.file.filename}}).then(data=>{
            }).catch(err=>{
                return res.json({statusCode:400, statusMsj: err})
            })
            return res.json({statusCode:200, statusMsj: "image uploaded", image:BASE_URL+req.file.filename})
        }
    })
}

