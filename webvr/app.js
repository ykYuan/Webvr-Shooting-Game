
var app = require('express')();
var server = require('http').createServer(app);

var express = require('express');
var io = require('socket.io')(server);
var bodyParser = require('body-parser')
var path = require('path');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

//This is the data in the database
var data = require('./database/score');

server.listen(8081, function () {
   console.log("Server listening at http://localhost:8081");
})


//cors deals with cross-domain queries
var cors = require('cors');
app.use(cors());

//admin is assigned to the first person that logs on to the game, is_admin turns to false after first /enter get request
var is_admin = true;

//An array of random names to assign to the players; names_dup is a copy of the original array
var names = ["Maroon 5", "Zedd", "Aladdin", "Coldplay", "Ant Man", "Mario", "Pikachu", "Jigglypuff", "Harry Potter", "Queen Elizabeth", "Donald Trump", "Iron Man", "Smurf", "Easter Bunny", "Santa Claus", "Lady Gaga", "Random Guy #69", "Theresa May"];
var names_dup = names.splice(0);

//Varable that indicates that the game is just starting (before admin presses start)
var beginning_game = true;

//This is the variable that stores the total number of users of the game
var total_users = 0;


//This variable indicates that the admin has pressed start and the game is going on
var in_game = false;

//This variable is set to true if a user joined the game midway
var joined_in_middle = false;

//The following is for serving the static HTML files
app.use('/', express.static(__dirname + '/webvr'));

app.get('/', function(req, res) {
	res.render(path.join(__dirname + 'webvr/index.html'));
});

//Called in the beginning when people enter the game room
app.get('/enter', function (req, res) {
	console.log("A user enters using /get");
	if (beginning_game) {
		shuffle(names_dup);
		clearDatabase();
		beginning_game = false;
	}
	else if (in_game) {
		joined_in_middle = true;
	}
	// Note: a user joining midway cannot be the admin
	if (is_admin) {
		is_admin = false; 
		addUser("Admin", data);
		console.log("admin joins");
		var object = createResponseObject(true, false, false, "Admin", null);
		total_users++;
		res.send(JSON.stringify(object));

	}
	//A player that joined in the middle of the game should not be able to affect the data stored
	else if (!joined_in_middle) {
		names_dup.shift();
		console.log("New User enters the game, send over unique name " + names_dup[0]);
		addUser(names_dup[0], data);
		var object = createResponseObject(false, true, false, names_dup[0], null);
		total_users++;
		res.send(JSON.stringify(object));
	}
	else {
		console.log("user tried to join in middle of game, ignore!!!");
	}
   
})


//Post request to update the score of a player
app.post('/post_score', function(req, res) {
	if (!joined_in_middle) {
		console.log("Post request for updating scores of players");
		console.log(req.body);
		var name = req.body.name;
		var score = req.body.score;
		update(name, score);
	}
});

//Get request signalling that the admin has left the page; in this case the server resets all the states to the very beginning of the game and disconnects all connected websockets
app.get('/admin_disconnect', function(req, res) {
	clearDatabase();
	is_admin = true;
	beginning_game = true;
	in_game = false;
	joined_in_middle = false;
	total_users = 0;
	console.log("admin disconnected from the server!");
	io.sockets.emit("admin_disconnect");
	io.sockets.sockets = {};
});






//The following code handles websocket connections
io.on('connection', function (socket) {
	if (!joined_in_middle) {
		console.log("A user connected!");
		socket.on('disconnect', function () {
	    	console.log('A user disconnected');
	    	//decrement total users because in current case a user disconnected
	    	if (total_users != 0) {
	    		total_users--;
	    	}
	    	
	  	});

	  	//Called when the admin presses the start button
		socket.on('ready', function () {
			console.log("Admin is ready, the game begins!");
			io.sockets.emit("signal", "starts");
			io.sockets.emit("allPlayersInfo", data);
			in_game = true;
		});

		//Called at the very end to retrieve all the scores of the players and then return the top three
		socket.on('postScore', function(data) {
			console.log("A user posted its score and this is the data: " + data);
			update(JSON.parse(data).name, JSON.parse(data).score);
			total_users--;
			console.log("Current total users is " + total_users);
			if (total_users <= 0) {
				console.log("Posting final results");
				var object = createResponseObject(false, false, false, null, getHighestScore());
				io.sockets.emit("results", JSON.stringify(object));
				is_admin = true;
				beginning_game = true;
				in_game = false;
				joined_in_middle = false;
				total_users = 0;
			}
		});

		//Called when the players' scores are sent throughout the game
		socket.on('liveScoreUpdate', function(user_score) {
			if (!beginning_game) {
				console.log("Live updating the score from " + JSON.parse(user_score).name);
				update(JSON.parse(user_score).name, JSON.parse(user_score).score);
				data.sort(compare);
				socket.emit("liveScoreUpdateResults", data);
			}
		});
	}
	
});


/****

    The following code deals with querying the database

*****/



//Gets all the players in the database
function getAllPlayers() {
	var players = [];
	for (var i = 0; i < data.length; i++) {
		players.push(data[i].name);
	}
	return players;
}


//Gets the top 3 highest score players in the database
function getHighestScore() {
	data.sort(compare);
	console.log("this is the current data " + data);
	var top_three = [];
	top_three.push(data[0]);
	top_three.push(data[1]);
	top_three.push(data[2]);
	return top_three;
}


//Updates the database based on the inputted name and score
function update(name, score) {
	for (var i = 0; i < data.length; i++) {
		if (data[i].name === name) {
			data[i].score = score;
			var json = JSON.stringify(data);
			break;
		}
	}
}

/****

    Helper function section

*****/



// compare function to be used in sorting
function compare(person_1, person_2) {
	if (parseInt(person_1.score) < parseInt(person_2.score)) {
		return 1;
	}
	else if (parseInt(person_1.score) > parseInt(person_2.score)) {
		return -1;
	}
	else {
		return 0;
	}
}

// shuffle function that randomly shuffles elements in an array
function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}

//Adds a new user to the database
function addUser(nam, data) {
	var object = {name: nam, score: 0};
	data.push(object);
	console.log(data);
	var json = JSON.stringify(data);
}

//Called at the very end to clear the database; basically just writes an empty JSON file
function clearDatabase() {
	var object = {};
	data = [];
	total_users = 0;
	names = ["Maroon 5", "Zedd", "Aladdin", "Coldplay", "Ant Man", "Mario", "Pikachu", "Jigglypuff", "Harry Potter", "Queen Elizabeth", "Donald Trump", "Iron Man", "Smurf", "Easter Bunny", "Santa Claus", "Lady Gaga", "Random Guy #69", "Theresa May"];
}


//This function creates the json return object
function createResponseObject(isAdmin, isPlayer, isHighestScores, uniqueName, highestScore) {
	var object = {
		admin: isAdmin,
		player: isPlayer,
		highestScore: isHighestScores,
		username: uniqueName,
		highest: highestScore
	};
	return object;
}



