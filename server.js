var http = require("http");
var p2 = require("p2")
var url = require('url');
var fs = require('fs');
var io = require('socket.io');
var rand = require('generate-key');
var Vector = require('victor')

var server = http.createServer(function(request, response) {
    console.log('Connection');
    var path = url.parse(request.url).pathname;

    switch (path) {
        case '/':
            fs.readFile(__dirname + '/index.html', function(error, data) {
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

io.listen(server);

// Global Game Constants
var DEFAULT_HP;
var FPS = 20;
var TIME_STEP = 1 / FPS;
var ONE_SEC = FPS;
var MAX_PLATFORM_NUM = 500;

var STAGE_MIN_X = 0;
var STAGE_MIN_Y = 0;
var STAGE_MAX_X = 500;
var STAGE_MAX_Y = 500;

var PLATFORM_WIDTH = 150;
var PLATFORM_HEIGHT = 30;
var PLATFORM_MASS = 0;
var PLATFORM_V = [0, 1]

var PLAYER_WIDTH = 10;
var PLAYER_HEIGHT = 10;
var PLAYER_MASS = 1;

var GRAVITY = [0, -10];
var MAX_PLAYER_NUM = 20;

// Global Game Variables
var player_list = Array(MAX_PLAYER_NUM)
var socket_set = {}
var platform_list = Array(MAX_PLATFORM_NUM)
var tick = 0;
var next_platform_pointer = 0;
var top_platform_pointer = 0;

// P2 Setting
var world = new p2.World({
    gravity : GRAVITY,
});
world.defaultContactMaterial.friction =  0
world.defaultContactMaterial.restitution = 1
world.defaultContactMaterial.stiffness = 1000000000;
world.solver.tolerance = 0.01;


function Platform(type, physic_body){
    this.type = type;
    this.physic_body = physic_body
}



function randomPlatform(){
    var max_x = STAGE_MAX_X - PLATFORM_WIDTH / 2;
    var min_x = STAGE_MIN_X + PLATFORM_WIDTH / 2;
    var x = Math.random() * (max_x - min_x) + min_x;
    var physic_body = new p2.Body({
        mass: PLATFORM_MASS,
        position: [x, 0 - PLATFORM_HEIGHT / 2],
        velocity: PLATFORM_V,
        damping: 0,
        fixedRotation: true,
    });
    physic_body.addShape(new p2.Box({ width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT}));
    world.addBody(physic_body);

    var platform = new Platform(
        0,
        physic_body
    )
    return platform;
}

//function gameloop(func, wait){
    //var l = function(w, t){
        //return function(){
            //if(true){
                //setTimeout(l, w);
                //try{
                    //func.call(null);
                //}
                //catch(e){
                    //t = 0;
                    //throw e.toString();
                //}
            //}
        //};
    //}(wait);
    //setTimeout(l, wait);
//};
function loop(){

}

setInterval(function(){
    // The step method moves the bodies forward in time.
	loop()
    world.step(TIME_STEP);
	//console.log(boxBody2.velocity, boxBody1.velocity)
    // Print the circle position to console.
    // Could be replaced by a render call.

}, TIME_STEP * 1000);
var serv_io = io.listen(server);

serv_io.sockets.on('connection', function(socket) {
    function login(account){
        var newest_platform = platform_list[next_platform_pointer - 1]
        var public_key = rand.generateKey();
        if (account == ""){
            console.log("Void Input!")
            socket.emit("login_key", -1)
        }else if (id == null){
            console.log("Too Many Players")
            socket.emit("login_key", -2)
        }else{
            var physic_body = new p2.Body({
                mass: PLAYER_MASS,
                position: [0, 0],
                damping: 0,
                fixedRotation: true,
            });
            physic_body.addShape(new p2.Box({ width: PLAYER_WIDTH, height: PLAYER_HEIGHT}));
            world.addBody(physic_body);

            //var player = new Player(
                //account,
                //socket,
                //key,
                //id,
                //DEFAULT_HP,
                //new Vector(50, 0),
                //new Vector(0, 0),
                //GRAVITY.clone()
            //);
            socket.physic_body = physic_body
            socket.public_key = public_key
            socket_set[public_id] = socket

            console.log("Login Success!")
            socket.emit("auth_data", {"public_key": public_key, "id": socket.id})
        }
    }
    function changeAction(data){
        //var player = getPlayerByAuth(auth)
		socket.action = data.action
        console.log(action)
    }
    socket.on("login", login);
    socket.on("action", changeAction)
    socket.on("disconnect", function(){
        console.log(socket.id)
    })
});
