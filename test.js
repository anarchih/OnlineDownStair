var http = require("http");
var url = require('url');
var fs = require('fs');
var io = require('socket.io'); // 加入 Socket.IO
var rand = require('generate-key');
var Vector = require('victor')

var server = http.createServer(function(request, response) {
    console.log('Connection');
    var path = url.parse(request.url).pathname;

    switch (path) {
        case '/':
            response.writeHead(200, {'Content-Type': 'text/html'});
        response.write('Hello, World.');
        response.end();
        break;
        case '/socket.html':
            fs.readFile(__dirname + path, function(error, data) {
            if (error){
                response.writeHead(404);
                response.write("opps this doesn't exist - 404");
            } else {
                response.writeHead(200, {"Content-Type": "text/html"});
                response.write(data, "utf8");
            }
            response.end();
        });
        break;
        default:
            response.writeHead(404);
        response.write("opps this doesn't exist - 404");
        response.end();
        break;
    }
});

server.listen(8001);

io.listen(server); // 開啟 Socket.IO 的 listene

// Global Game Constants
var DEFAULT_HP;
var FPS = 20;
var ONE_SEC = FPS;
var MAX_PLATFORM_NUM = 500;
var STAGE_MIN_X = 0;
var STAGE_MIN_Y = 0;
var STAGE_MAX_X = 500;
var STAGE_MAX_Y = 500;
var PLATFORM_WIDTH = 150;
var PLATFORM_HEIGHT = 30;
var PLATFORM_V = Vector(0, -1);
var PLATFORM_A = Vector(0, 0);
var MAX_PLAYER_NUM = 20;


// Global Game Variables
var player_list = Array(MAX_PLAYER_NUM)
var platform_list = Array(MAX_PLATFORM_NUM)
var tick = 0;
var next_platform_pointer = 0;
var top_platform_pointer;
function Platform(type, height, width, p, v, a){
    this.type = type;
    this.height = height;
    this.width = width;
    this.p = p;
    this.v = v;
    this.a = a;
}
function Player (account, key, hp, position, on_platform){
     this.account = account
     this.key = key
     this.hp = hp;
     this.p = position;
     this.on_platform = on_platform;
}

function getPlayerByAuth(auth){
    if(player_list[auth.id].key == auth.key){
        return player_list[auth.id];
    }else{
        console.log("Error ID or key!");
    }
}

function randomPlatform(){
    var max_x = STAGE_MAX_X - PLATFORM_WIDTH / 2;
    var min_x = STAGE_MIN_X + PLATFORM_WIDTH / 2;
    var x = Math.random() * (max_x - min_x) + min_x;
    var p = new Platform(
        1,
        100,
        100,
        Vector(x, STAGE_MAX_Y + PLATFORM_HEIGHT / 2),
        PLATFORM_V,
        PLATFORM_A
    )
    return p;
}

function getVoidID(){
    for (var i = 0; i < player_list.length; i ++){
        console.log(player_list[i])
        if (player_list[i] == null){
            return i;
        }
    }
    return null;
}
function gameloop(func, wait){
    var l = function(w, t){
        return function(){
            if(true){
                setTimeout(l, w);
                try{
                    func.call(null);
                }
                catch(e){
                    t = 0;
                    throw e.toString();
                }
            }
        };
    }(wait);
    setTimeout(l, wait);
};
function timeEventHandler(start_time, time_interval, end_time){

}
function loop(){
    if(tick % (2 * ONE_SEC) == 0){
        platform_list[next_platform_pointer] = randomPlatform()
        //top_platform_pointer = ((top_platform_pointer + 1) % MAX_platform_NUM)
        next_platform_pointer = ((next_platform_pointer + 1) % MAX_PLATFORM_NUM)
    }

     platform_list[0].v.add(platform_list[0].a)
     platform_list[0].p.add(platform_list[0].v)
    tick += 1;

}
var serv_io = io.listen(server);

serv_io.sockets.on('connection', function(socket) {
    function login(account){
        var platform = platform_list[platform_list.length - 1]
        var key = rand.generateKey();
        var id = getVoidID()
        if (account == ""){
            console.log("Void Input!")
            socket.emit("login_key", -1)
        }else if (id == null){
            console.log("Too Many Players")
            socket.emit("login_key", -2)
        }else{
            var player = new Player(
                account,
                key,
                id,
                DEFAULT_HP,
                Vector(10, 10),
                false
            );
            player_list[id] = player
            console.log("Login Success!")
            socket.emit("auth_data", {"key": key, "id": id})
        }
    }
    function changeAction(data){
        var auth = data.auth;
        var action = data.action;
        var player = getPlayerByAuth(auth)
        console.log(action)
    }
    gameloop(function(){
        loop();
        socket.emit("tmp", platform_list);
    }, 1000 / FPS);
    socket.on("login", login);
    socket.on("action", changeAction)
});
