import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import readline  from 'readline';
import {ProtoGrpcType} from './proto/random' 

const PORT = 8082;
const PROTO_FILE = './proto/random.proto'

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType

//Passing the host name
const client = new grpcObj.randomPackage.Random(
    `0.0.0.0:${PORT}`, grpc.credentials.createInsecure()
)

const deadline = new Date()
deadline.setSeconds(deadline.getSeconds() + 5)
client.waitForReady(deadline, (err) => {
    if(err) {
        console.log(err)
        return
    }
    // Our functions:
    onClientReady()
})


function onClientReady() {
    //*UNARY RESPONSE
    // client.PingPong({message: "Ping"}, (err, result) => {
    //     if(err) {
    //         console.log(err)
    //         return
    //     }
    //     console.log(result)
    // }) 

    // // *SERVER STREAM - Give us a stream vairable
    // const stream = client.randomNumber({maxVal: 100})
    // //Like event listener for data
    // stream.on("data", (chunck) => {
    //     console.log(chunck)
    // })
    // stream.on("end", () => {
    //     console.log("communication ended")
    // })

    // //*CLIENT STREAM - Give us a stream vairable
    // const stream = client.TodoList((err, result) => {
    //     if(err) {
    //         console.log(err)
    //         return
    //     }
    //     console.log(result)
    // })
    // stream.write({todo: "walk", status: "Doing"})
    // stream.write({todo: "clean", status: "Never"})
    // stream.write({todo: "run", status: "Maybe"})
    // stream.write({todo: "drink", status: "Always"})
    // stream.end()

    const rl = readline.createInterface({ // For writing messages in+out
        input: process.stdin,
        output: process.stdout
    })

    // Check if user has username
    const username = process.argv[2]
    if(!username) console.error("No username, cant join chat"), process.exit();
    // Attach metadata
    const metadata = new grpc.Metadata()
    // Add username
    metadata.set("username", username)
    const call = client.Chat(metadata)
    // user register
    call.write({
        message: "register",
    })

    call.on("data", (chunk) => {
        console.log(`${chunk.username} ==> ${chunk.message}`)
    })
    // write the data
    rl.on("line", (line) => {
        if(line == "quit") {
            call.end()
        } else {
            call.write({
                message: line
            })
        }
    })
}

