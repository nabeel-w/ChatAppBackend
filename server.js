import { Server } from 'socket.io';
import dotenv from 'dotenv';


dotenv.config();

const PORT = process.env.PORT || 3000;

const io = new Server(PORT, {
    cors: {
        // Set up CORS configuration
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

const rooms = [];

const haveCommonElement = (arr1, arr2) => {
    return arr1.some(element => arr2.includes(element));
};

function findCommonElements(arr1, arr2) {
    const set1 = new Set(arr1.map(element => element.toLowerCase()));
    const commonElements = arr2.filter((element) => set1.has(element.toLowerCase()));

    return commonElements;
};

const handleDisconnect=(socket)=>{
    const roomIndex = rooms.findIndex(room => room.users.some(user => user.socketId === socket.id));
        if (roomIndex !== -1) {
            const room = rooms[roomIndex];
            io.to(room.name).emit('roomDestroyed', socket.id);
            rooms.splice(roomIndex,1);
            console.log("Room Destroyed ",rooms);
        }
        else{
            console.log("Room Doesn't Exist ",rooms);
        }
}


io.on('connection', socket => {
    console.log('User connected:', socket.id);

    socket.on('joinRandomRoom', interests => {
        const availableRooms = rooms.filter(room => room.users.length === 1 && haveCommonElement(room.users[0].interests, interests));

        console.log(availableRooms);
        if (availableRooms.length > 0) {
            const room = availableRooms[0];

            // Enforce two users per room
            if (room.users.length === 1) {
                const commanIntrests=findCommonElements(interests, room.users[0].interests)
                room.users.push({ socketId: socket.id, interests });
                socket.join(room.name);
                io.to(room.name).emit('roomJoined', room.users.map(user => user.socketId), room.name, commanIntrests);
            }
        } else {

            const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
            //console.log(randomRoom);
            if (randomRoom && randomRoom.users.length === 1) {
                randomRoom.users.push({ socketId: socket.id, interests });
                socket.join(randomRoom.name);
                io.to(randomRoom.name).emit('roomJoined', randomRoom.users.map(user => user.socketId), randomRoom.name, []);
            }
            else {
                console.log("New Room Created");
                const newRoom = {
                    name: `room_${rooms.length + 1}`,
                    users: [{ socketId: socket.id, interests }]
                };
                rooms.push(newRoom);
                socket.join(newRoom.name);
                socket.emit('roomCreated', newRoom.name);
            }
        }
    })

    socket.on('leaveRoom',()=>{ handleDisconnect(socket) })


    socket.on('disconnect', () => { handleDisconnect(socket) })

    socket.on('sendMessage',(msg,recepientId)=>{
        console.log("User ID: ",socket.id,"Message: ",msg);
        io.to(recepientId).emit('newMessage',(msg));
    })

    socket.on('isTyping', (recepientId, Typing)=>{
        io.to(recepientId).emit('typing',(Typing));
    })

})