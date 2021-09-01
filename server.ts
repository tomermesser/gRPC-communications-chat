import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {ProtoGrpcType} from './proto/random' 
import { RandomHandlers } from './proto/randomPackage/Random'
import { TodoResponse } from './proto/randomPackage/TodoResponse';
import { TodoRequest } from './proto/randomPackage/TodoRequest';
import { ChatResponse } from './proto/randomPackage/ChatResponse';
import { ChatRequest } from './proto/randomPackage/ChatRequest';

const PORT = 8082;
const PROTO_FILE = './proto/random.proto'

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType
const randomPackage = grpcObj.randomPackage

//Initialize server
function main() {
    const server = runServer()
    //Bind the protocol with our local-server
    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if(err) {
            console.log(err)
            return
        }
        console.log(`Your server is running on port - ${port}`)
        server.start();
    })
}

//TODO LIST DATA [Client streaming]
const todoList: TodoResponse = {todos:[]}
//TODO LIST DATA [BI-directional Streaming]
const callObjByUsername = new Map<string, grpc.ServerDuplexStream<ChatRequest, ChatResponse>>() // key = string request(msg), value = string response(user+msg)


//Running the protocol
function runServer() {
    const server = new grpc.Server()
    server.addService(randomPackage.Random.service, {
        
        //Service 1 - Unary ----------------------
        // PingPong: (req, res) => {
        //   console.log(req, res)
        //   res(null, {message: "Pong"})
        // },

        //Service 2 - Server Stream ----------------
        // RandomNumber: (call) => {
        //     const { maxVal = 10 } = call.request
        //     console.log({maxVal})
            
        //     let runCount = 0;
        //     const id = setInterval(() =>{
        //         runCount += 1;
        //         call.write({num: Math.floor(Math.random() * maxVal)})

        //         if(runCount > 10) {
        //             clearInterval(id);
        //             call.end()
        //         }
        //     }, 500)
        // },

        //Service 3 - Client Stream ----------------
        // TodoList: (call, callback) => {
        //     call.on("data", (chunk : TodoRequest) => {
        //         todoList.todos?.push(chunk)
        //         console.log(chunk)
        //     })

        //     call.on("end", () => {
        //         callback(null, {todos: todoList.todos})
        //     })
        // },

        //Service 4 - BI-directional Streaming ---------------- every time the client send new request it will be same call object
        Chat: (call) => {
            call.on("data", (req) => { // listening to the data event !
                const username = call.metadata.get('username')[0] as string // metadata stores the data of the call object
                const msg = req.message
                console.log(username, "|", req.message, "at:", new Date())
                for (let [user, userCall] of callObjByUsername) {
                    if(username !== user) { // send to everyone
                        userCall.write({
                            username: username,
                            message: msg
                        })
                    }
                }
                //if its a new user.. save it in callObjByName
                if (callObjByUsername.get(username) === undefined) {
                    callObjByUsername.set(username, call)

                }
            }) 
            //if client canceld/stop the communication -> delete him from the chat obj
            call.on(("end"), () => {
                const username = call.metadata.get('username')[0] as string
                callObjByUsername.delete(username)
                console.log(`${username} | ended their chat session.`)
                for (let [user, userCall] of callObjByUsername) {
                    userCall.write({
                        username: username,
                        message: "left the chat..."
                    })
                }
                call.write({
                    username: `Server`,
                    message: `${username} just left, see ya next time.`
                })
                call.end();
            })
        }
        
    } as RandomHandlers )

    return server
}

main()