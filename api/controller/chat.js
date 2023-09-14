const Chat = require('../model/chat');
const User = require('../model/user');
const Message = require('../model/message')
const invoke = require("../fabric/invoke")



exports.createChat = async (req, res) => {
    const { userId } = req.body; //login user send us Id whichever his want to chat
    if (!userId) {   //check old chat is avaliwable or not
        return res.sendStatus(400);
    }

    var isChat = await Chat.find({       //first chat exist 
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } }, //login user
            { users: { $elemMatch: { $eq: userId } } }        //                                   
        ]
    }).populate("users", "-password").populate("users", "-confirmpassword").populate("latestMessage"); //if chat found populate users array

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "name pic email",
    });
    if (isChat.length > 0) {
        // res.send(isChat[0]);
        res.json({ statusCode: 200, statusMsg: "Chat already Created", Chat: isChat[0] })
    } else {
        var chatData = {
            chatName: "sender",
            users: [req.user._id, userId]
        }
        try {
            var chatWith = await User.findOne({_id:userId})
            
            if(!chatWith){
                return res.json({statusCode:400,statusMsg:"User Not Found" })
            }
            // const createdChat = await Chat.create(chatData);
            var userName =req.user.userName
            var channelName = 'mychannel'
            var chaincodeName = 'chat-app'
            
            var functionName = "InitLedger"
            var args=[]
            var result = await invoke.invokeChaincode(userName, channelName, chaincodeName, functionName, args)
            if(result.success == true){
  
             const createdChat = await Chat.create(chatData);
               const FullChat = await Chat.findOne({ _id: createdChat._id }).populate("users", "-password").populate("users", "-confirmpassword");
                res.json({ 
                    statusCode: 200, 
                    statusMsg: "Chat Created Successfully",
                    chaincodeResponse:result.chaincodeResponse,
                    Chat: FullChat})
            }else{
                res.json({ 
                    statusCode: 400, 
                    statusMsj:result.message
                })
            }
            
        } catch (error) {
            console.log(error)
            return res.json({statusCode:500, statusMsj:error.message})
        }
    }

}

exports.fetchchat = async (req, res) => {
    try {
        if (req.user.role == 3) {
            Chat.find().sort({ updatedAt: 1 }).populate("users", "-accessToken")
                .populate("latestMessage")
                .then(async (results) => {
                    results = await User.populate(results, {
                    path: "latestMessage",
                    path: "latestMessage.sender",
                    select: "name pic email"
                });
                var new_arr = []
                results.forEach(async item=>{
                    var unread_messages = await Message.count({sp_read_status:false, chat:item._id});
                    var chat_obj = {
                        _id:item._id,
                        image:item.users[1].pic,
                        reciver_name:item.users[0].first_name + " "+item.users[0].last_name + " - "+item.users[1].first_name + " "+item.users[1].last_name,
                        reciver_id:item.users[0]._id +" - "+item.users[1]._id,
                        updatedAt:item.updatedAt,
                        unread_messages:unread_messages
                    }
                    if(item.latestMessage){
                        chat_obj.latestMessage= item.latestMessage.content
                    }else{
                        chat_obj.latestMessage = ""
                    }
                    new_arr.push(chat_obj);
                })
                setTimeout(()=>{
                    if(results.length === 0){  
                        return  res.json({statusCode:400,statusMsg:"chat not created"})
                    }   
                    else{
                        return  res.json({statusCode:200,statusMsj:"supervisor,  All users chat",chat:new_arr})
                    }
                },1000);
                }).catch(error => {
                    return res.json({statusCode:400, statusMsj: error.message })
                })
        }
        else {
            Chat.find({
                users: { $elemMatch: { $eq: req.user._id } }
            }).sort({ updatedAt: 1 })
                .populate("users", "-password")
                .populate("latestMessage")
                .then(async (results) => {
                    results = await User.populate(results, {
                        path: "latestMessage",
                        path: "latestMessage.sender",
                        select: "name pic email"
                    });
                    var new_arr = []
                    results.forEach(async item => {
                        var unread_messages = await Message.count({ read_status: false, chat: item._id , sender: { $ne: req.user._id }});
                        var chat_obj = {
                            _id: item._id,
                            // reciver_name: item.users[1].first_name + " " + item.users[1].last_name,
                            // reciver_id: item.users[1]._id,
                            // image: item.users[1].pic,
                            updatedAt: item.updatedAt,
                            unread_messages: unread_messages
                        }
                         if(req.user._id.equals(item.users[0]._id)){
                                chat_obj.reciver_name=item.users[1].first_name + " "+item.users[1].last_name,
                                chat_obj.reciver_id=item.users[1]._id ,
                                chat_obj.image= item.users[1].pic
                        }else{
                            chat_obj.reciver_name=item.users[0].first_name + " "+item.users[0].last_name,
                            chat_obj.reciver_id=item.users[0]._id ,
                             chat_obj.image= item.users[0].pic
                        }
                    
                        
                        if (item.latestMessage) {
                            chat_obj.latestMessage = item.latestMessage.content
                        }else {
                            chat_obj.latestMessage = ""
                        }
                        new_arr.push(chat_obj);
                    })
                    setTimeout(() => {
                        if (results.length === 0) {
                            return res.json({ statusCode: 400, statusMsj: "chat not created" })
                        }
                        else {
                            return res.json({ statusCode: 200,statusMsj:"chat", chat: new_arr })
                        }
                    }, 1000);
                })
        }
    } catch (error) {
        // res.status(500);
        return res.json({statusCode:500, statusMsj:error.message})
        // throw new Error(error.message);
    }
}

exports.allChat = async (req,res) => {
    try{
         Chat.find().sort({ updatedAt: -1 })
         .populate("users", "-accessToken")
         .populate("latestMessage")
            .then(async (results) => {
                return res.json({statusCode:200 ,statusMsj:"All users chat",data:results});
            })
    }catch(error){
        return res.json({statusCode:500, statusMsj:error.message})
        // res.status(400);
        // throw new Error(error.message)
    }
}


exports.deleteall = async(req, res)=>{
    var user = await User.deleteMany()
    var chat = await Message.deleteMany()
    var message = await Chat.deleteMany()
}
