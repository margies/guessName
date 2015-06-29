
//-------------------------------------------------------------------

var http = require("http");
var url = require('url');
var fs = require('fs');
var io = require('socket.io'); // 加入 Socket.IO

//-------------------------------------------------------------------

var server = http.createServer(function(request, response) {
  //console.log('Connection');
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

//-------------------------------------------------------------------

var serv_io = io.listen(server);
var memberList = {};
var questionList = {};
var memberIndex = 1;
// if gameStatus == 1, means can start
var gameStatus = 0;
// scope: 
// questionMemberPair[guesser]['question'] = question
// questionMemberPair[guesser]['questioner'] = questioner
var questionMemberPair = {};

// close debug message
serv_io.set('log level', 1);


//-------------------------------------------------------------------

// if connection success
serv_io.sockets.on('connection', function(socket) {
  
  // get connector id
  //console.log(socket.id);


  //-------------------------

  // Send initialMember list to new client
  var mString = "";
  for(key in memberList){
      mString = mString + "&nbsp;&nbsp;&nbsp;" + memberList[key];
    
  }
  socket.emit('initialMember', mString);
  if(gameStatus == 1){
    socket.emit('gameStarting', "1");
  }

  //-------------------------

  // If received data from client
  socket.on('client_data', function(data) {
    if(gameStatus != 0){
      //window.alert("遊戲已經開始囉，無法加入戰局");
      socket.emit('error', "遊戲已經開始囉，無法加入戰局");
    }else{
      // write to console
      process.stdout.write("新遊戲者加入："+data.member+"\n");
      // push into memberList
      memberList[socket.id] = data.member;
      // sent back to client
      socket.emit('member', data.member);
      // sent back memberIndex to client
      socket.emit('memberIndex', memberIndex++);
      // brocast new member name to all client except the one just connected in
      socket.broadcast.emit('member', data.member);
      
      console.log(memberList);
    }
    

  }); // end of socket.on('client_data', function(data) {
  
  //-------------------------

  // If a client disconnect
  socket.on('disconnect', function () {

        for(key in memberList){
          if(key == socket.id){
            memberIndex--;
          }
        }

        // echo socket id
        console.log("disconnect:"+socket.id);
        // remove from memberList
        delete memberList[socket.id];
        //memberList.splice("'"+socket.id+"'", 1);
        //console.log(memberList);
        // Send new Member list to client
        var mString = "";
        for(key in memberList){
            mString = mString + "&nbsp;&nbsp;&nbsp;" + memberList[key];
          
        }
        socket.broadcast.emit('initialMember', mString);


        

  }); // end of socket.on('disconnect', function () {

  //-------------------------
  
  // If received questions from client
  socket.on('question', function(data) {

    // write to console
    process.stdout.write(memberList[socket.id]+"的題目是 "+data.question+"\n");
    // push into memberList
    questionList[socket.id] = data.question;
    
    // if gameStatus == 1
    if(gameStatus == 1){
      // check if everyone had release question
      var temp = 1;
      for(key in questionList){
        temp++;
      }
      if (temp == memberIndex){

        var nowName = "";
        var firstName = "";
        var tempQ = "";
        var tempName = "";
        var tempIndex = 1;

        for(key in questionList){

          console.log(key);

          if(tempIndex != 1){
            nowName = memberList[key];
            var temparray = {};
            temparray['question'] = tempQ;
            temparray['questioner'] = tempName;
            questionMemberPair[nowName] = temparray;

          }else{
            firstName = memberList[key];
          }
          tempQ = questionList[key];
          tempName = memberList[key];
          tempIndex++;
        
        }

        var temparray = {};
        temparray['question'] = tempQ;
        temparray['questioner'] = tempName;
        questionMemberPair[firstName] = temparray;

        console.log(questionMemberPair);

        var tempJson = JSON.stringify(questionMemberPair);
        socket.broadcast.emit('qDone', {
              'questionMemberPair': tempJson
            });
        socket.emit('qDone', {
              'questionMemberPair': tempJson
            });

      } // end of if (temp == memberIndex){
    }
    
    console.log(questionList);

  }); // end of socket.on('client_data', function(data) {
  
  //-------------------------
  
  // If anyone says the game can start
  socket.on('gameStart', function(data) {

    // if no member exist
    if(memberIndex <= 2){
      socket.emit('errors', "遊玩人數小於兩人欸 你們玩得起來ㄇ");
    }else{
      if(data == '1'){
        gameStatus = 1;
        socket.broadcast.emit('gameStarting', "1");
        socket.emit('gameStarting', "1");
      }

    // check if everyone had release question
    var temp = 1;
      for(key in questionList){
        temp++;
      }
      if (temp == memberIndex){

        var nowName = "";
        var firstName = "";
        var tempQ = "";
        var tempName = "";
        var tempIndex = 1;

        for(key in questionList){

          console.log(key);

          if(tempIndex != 1){
            nowName = memberList[key];
            var temparray = {};
            temparray['question'] = tempQ;
            temparray['questioner'] = tempName;
            questionMemberPair[nowName] = temparray;

          }else{
            firstName = memberList[key];
          }
          tempQ = questionList[key];
          tempName = memberList[key];
          tempIndex++;
        
        }

        var temparray = {};
        temparray['question'] = tempQ;
        temparray['questioner'] = tempName;
        questionMemberPair[firstName] = temparray;

        console.log(questionMemberPair);

        var tempJson = JSON.stringify(questionMemberPair);
        socket.broadcast.emit('qDone', {
              'questionMemberPair': tempJson
            });
        socket.emit('qDone', {
              'questionMemberPair': tempJson
            });

      } // end of if (temp == memberIndex){
      console.log(questionList);
    }
    
  }); // end of socket.on('gameStart', function(data) {
  
  //-------------------------
  
  // If a client reset
  socket.on('reset', function () {

    questionList = {};
    // if gameStatus == 1, means can start
    gameStatus = 0;
    // scope: 
    // questionMemberPair[guesser]['question'] = question
    // questionMemberPair[guesser]['questioner'] = questioner
    questionMemberPair = {};

    socket.broadcast.emit('reset',"1");
    

  }); // end of socket.on('reset', function () {

  //-------------------------
  
}); // end of serv_io.sockets.on('connection', function(socket) {