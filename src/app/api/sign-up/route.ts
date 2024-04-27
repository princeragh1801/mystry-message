import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/user.model";
import bcrypt from 'bcryptjs'

import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";

export async function POST(request : Request) {
    await dbConnect()
    try {
        const {username, email, password} = await request.json()
        const userExistByUsernameAndVerified = await UserModel.findOne({username, isVerified:true});
        if(userExistByUsernameAndVerified){
            console.log("User already exist");
            return Response.json({
                success : false,
                message : "Username already taken"
            },{
                status : 400
            });
        }
        const userExistByEmail = await UserModel.findOne({email});
        const verifyCode = Math.floor(100000+Math.random()*900000).toString()
        if(userExistByEmail){
            if(userExistByEmail.isVerified){
                return Response.json({
                    success : false,
                    message : "User already exist with email"
                },{
                    status : 400
                });
            }else{
                const hashedPassword = await bcrypt.hash(password, 10);
                userExistByEmail.password = hashedPassword
                userExistByEmail.verifyCode = verifyCode,
                userExistByEmail.verifyCodeExpiry = new Date(Date.now()+3600000)
                await userExistByEmail.save()
            }
        }else{
            const hashedPassword = await bcrypt.hash(password, 10);
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 1);
            const newUser = new UserModel({
                username,
                email,
                password : hashedPassword,
                verifyCode,
                verifyCodeExpiry : expiryDate,
                isVerified :false,
                isAcceptingMessage : true,
                messages : []

            })

            await newUser.save()
        }
        const emailResponse = await sendVerificationEmail(
            email,
            username,
            verifyCode
        )
        if(!emailResponse.success){
            return Response.json({
                success : false,
                message : emailResponse.message
            },{
                status : 500
            })
        }
        return Response.json({
            success : true,
            message : "User registered successfully. Please verify your email"
        },{
            status : 200
        })
    } catch (error) {
        console.error("Error while registering the user ", error)
        return Response.json({
            success : false,
            message : "Error while registering the user"
        },{
            status : 500
        })
    }
}