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
var NORMAL_PLATFORM = 1;
var NAIL_PLATFORM = 2;
var LEFT_PLATFORM = 3;
var RIGHT_PLATFORM = 4;
var JUMP_PLATFORM = 5;

var MAX_HP = 10;
var DEFAULT_HP = MAX_HP;
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
var DEFAULT_MAX_HP = 10;
var SPAMN_HEIGHT_OFFSET = 10;

var GRAVITY = [0, -10];
var MAX_PLAYER_NUM = 20;

// Global Game Variables
var player_set = {}
var socket_set = {}
var shared_set = {}
var platform_list = Array(MAX_PLATFORM_NUM)
var tick = 0;
var next_platform_pointer = 0;
var top_platform_pointer = 0;
var public_key_counter = 0;
var platform_id_counter = 0;
// P2 Setting
var world = new p2.World({
    gravity : GRAVITY,
});
world.defaultContactMaterial.friction =  0
world.defaultContactMaterial.restitution = 1
world.defaultContactMaterial.stiffness = 1000000000;
world.solver.tolerance = 0.0001;

function StaticTimeIntervalStrategy(time_interval, ){
    this.time_interval = time_interval
    this.update = function(manager){

        if (manager.tick % time_interval == 0){
            var platform = this.genPlatform();
            manager.list.push(platform)
        }
    }
    this.genPlatform = function(){
        var max_x = STAGE_MAX_X - PLATFORM_WIDTH / 2;
        var min_x = STAGE_MIN_X + PLATFORM_WIDTH / 2;
        var x = Math.random() * (max_x - min_x) + min_x;
        var id = platform_id_counter;
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
            id,
            physic_body,
        )
        this.id_counter ++;
        return platform;
    }

function SortedPlatformManager(strategy){
    this.strategy = strategy;
    this.list = [];
    this.tick = 0;
    this.id_counter = 0;
    this.update = function(){
        this.strategy.update(this);
        list = this.list;
        for (var i in list){
            if (list[i] >= STAGE_MAX_Y + PLATFORM_HEIGHT / 2){
                // Remove all invisible platforms
                this.list.shift();
            }else if(list[i] >= STAGE_MAX_Y - PLATFORM_HEIGHT / 2 - PLAYER_HEIGHT){
                // disable the physic body of platform when it is nearly invisible
                // It enables players to fall down.
                this.list[i].physic_body.shapes[0].collisionResponse = false;
            }else{
                break;
            }
        }
        manager.tick += 1
    }
}
function SkyObj(){
    this.getStateObj = function(player){
        return new OnSkyState(player);
    }

}
function Platform(type, id, physic_body){
    this.type = type;
    this.id = id;
    this.physic_body = physic_body
    this.getStateObj = function(player){
        return null;
    }
}


function NormalPlatform(type, id, physic_body){
    this.type = type;
    this.id = id;
    this.physic_body = physic_body
    this.getStateObj = function(player){
        return new OnNormalPlatformState(player);
    }
}
function LeftMove(){
    this.move = function(state){
        state.moveLeft();
    }
}

function RightMove(){
    this.move = function(state){
        state.moveRight();
    }
}

function NoneMove(){
    this.move = function(state){
        state.moveNone();
    }
}

function Status(){
    this.on_obj = null;
    this.state_name = OnSkyState.name;
    this.move_name = NoneMove.name;
    this.max_hp = DEFAULT_MAX_HP;
    this.hp = this.max_hp;
    this.score = 0;
}

function OnPlayerState(player){
    this.player = player;
    this.move_speed = 1;
    this.move = function(){
        this.player.move_action.move();
    }
    this.moveLeft = function(){
        this.player.velocity[0] = - this.move_speed;
    }
    this.moveRight = function(){
        this.player.velocity[0] = this.move_speed;
    }
    this.moveNone = function(){
        this.player.velocity[0] = 0;
    }
    this.onChangeEvent = function(){
        //
    }
}

function OnSkyState(player){
    this.player = player;
    this.move_speed = 1;
    this.move = function(){
        this.player.move_action.move();
    }
    this.moveLeft = function(){
        this.player.velocity[0] = - this.move_speed;
    }
    this.moveRight = function(){
        this.player.velocity[0] = this.move_speed;
    }
    this.moveNone = function(){
        this.player.velocity[0] = 0;
    }
    this.onChangeEvent = function(){
        //
    }
}

}
function OnNormalPlatformState(player){
    this.player = player;
    this.move_speed = 1;
    this.move = function(){
        this.player.move_action.move();
    }
    this.moveLeft = function(){
        this.player.velocity[0] = - this.move_speed;
    }
    this.moveRight = function(){
        this.player.velocity[0] = this.move_speed;
    }
    this.moveNone = function(){
        this.player.velocity[0] = 0;
    }
    this.onChangeEvent = function(){
        if (player.hp < player.maxHP){
            this.player.hp += 1;
        }
    }
}

function MovementInfo(player){
    this.p = player.physic_body.position
    this.v = player.physic_body.velocity
}

function Player(public_id, physic_body, status){
    this.public_id = public_id;
    //this.movement_info = new MovemoentInfo(this)
    this.physic_body = physic_body;
    this.move_action = NoneMove();
    this._state = new NormalState();
    this.status = status;
    this.changeState = function(new_state){
        this.status.state_name = new_state.constructor.name
        this._state = new_state;
        this._state.onChangeEvent();
    }
    this.executeState = function(){
        this.move_action.move();
    }
    this.behaviorUpdate = function(){
        // player interact with ceil
        if (player.position[1] > STAGE_MAX_Y + PLAYER_HEIGHT / 2){
            player.position[1] = STAGE_MAX_Y + PLAYER_HEIGHT / 2;
            player.velocity[1] = 0;
        }
        // player interact with other obj
        var standing_obj = this.getStandingObj();
        if (this.status.on_obj !== standing_obj){
            var new_state = standing_obj.getStateObj(this);
            this.status.on_obj = standing_obj;
            this.changeState(new_state);
         }
        this.executeState();
    }
    this.getStandingObj = function(){
        var standing_obj = pm.getStandingPlatform(this)
        if (standing_obj === null){
            // check player stand on which player
            for (var i in player_list){
                var player = player_list[i]
                if (player !== this && this.standOn(player)){
                    standing_obj = player;
                    break;
                }
            }

            if (standing_obj ==== null){
                return SkyPlatform();
            }
        }
        return standing_obj;
    }
    this.getStateObj = function(player){
        return null;
    }
}

function spawnPlayerOnPlatform(player){
    var newest_platform = pm.list[next_platform_pointer - 1];
    var x = newest_platform.position[0];
    var y = newest_platform.position[1] + PLATFORM_HEIGHT / 2 + SPAWN_HEIGHT_OFFSET;
    var status = new Status();
    player.physic_body.position = new Float32Array([x, y]);
    player.physic_body.velocity = new Float32Array([0, 0]);
    player.status = status
    player.changeState(new NormalState())
}

function randomPlatform(){
    var max_x = STAGE_MAX_X - PLATFORM_WIDTH / 2;
    var min_x = STAGE_MIN_X + PLATFORM_WIDTH / 2;
    var x = Math.random() * (max_x - min_x) + min_x;
    var id = platform_id_counter;
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
        id,
        physic_body,
    )
    platfrom_id_counter ++;
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
function init(){
    platform_strategy = aaa
    pm = sss

}
function loop(){
    pm.update();
    for (var i in player_list){
        var player = player_list[i]
        player.updateBehavior()
    }
    tick ++;
    world.step(TIME_STEP);
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
        var public_key = public_key_counter;
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
            var player = new Player(
                public_id,
                physic_body,
                new Status()
            )
            spawnPlayerOnPlatform(player);

            socket.public_key = public_key
            socket.player = player
            socket_set[public_key] = socket
            player_set[public_key] = player
            shared_set[public_key]['status'] = player.status
            shared_set[public_key]['status'] = player.status
            shared_set[public_key]['status'] = player.status
            public_key_counter ++;
            console.log("Login Success!")
            socket.emit("auth_data", {"public_key": public_key, "id": socket.id})
        }
    }
    function changeAction(data){
        //var player = getPlayerByAuth(auth)
		//socket.action = data.action
        var move_action;
        var name;
        if (data.action == "left"){
            move_action = new LeftMove();
            name = LeftMove.name;
        }else if(data.action == "right"){
            move_action = new RightMove();
            name = RightMove.name;
        }else{
            move_action = new NoneMove();
            name = NoneMove.name;
        }
        socket.player.move_action = move_action;
        socket.player.status.move_name = name;
    }
    socket.on("login", login);
    socket.on("action", changeAction)
    socket.on("disconnect", function(){
        console.log(socket.id)
        var key = socket.public_key;
        world.removeBody(socket_set[key].player.physic_body)
        delete socket_set[key].player
        delete socket_set[key];
        delete player_set[key];
    })
});
