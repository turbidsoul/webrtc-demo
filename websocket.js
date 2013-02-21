var socket
var localvideo
var remotevideo
var source
var webmessage = 'http://192.168.0.100:9000'
var pc;
var username, remotename;
var localoffer;
var localstream, remotestream;

// source = new EventSource("events");

// source.addEventListener("offer", function(e) {
//   console.log(e);
// }, true);

// source.addEventListener('answer', function(e){
//   console.log(e)
// }, false);

function connection() {
  try {
    socket = new WebSocket("ws://192.168.1.196:8080")
    socket.onopen = function(msg) {
      trace("Connection WebSocket server[" + socket.url + "]success");
      var user = $('#user').val();

      if(!user) {
        alert('请填入用户名');
        return;
      }
      username = user;
      send(JSON.stringify({'username': username, 'type':'connection'}))
    };
    socket.onmessage = function(msg){
      trace("收到信息:" + msg.data);
      var json = JSON.parse(msg.data);
      if(json.type === 'sdp') {
        acceptCall(json);
      } else if (json.type === 'error') {
        alert(json.message);
      } else if(json.type === 'message') {
        alert(json.username + ":" + json.message);
      } else if(json.type === 'offer') {
        acceptCall(json);
      } else if(json.type == 'answer') {
        console.log('recrive answer:' + JSON.stringify(json));
        pc.setRemoteDescription(json.answer);
      }
    };
    socket.onclose = function(msg){
      console.exception();
      trace("Disconnection WebSocket server[" + socket.url + "]");
    };
  } catch(e) {
    error(e);
  }

  return socket;
}

function send(msg) {
  if(socket && socket.readyState == socket.OPEN){
    trace("发出信息:" + msg)
    socket.send(msg);
  } else {
    console.log('发送失败');
  }
}

function send_msg() {
  var msg = $("#msg").val();
  if(!socket) {
    alert('未连接WebSocket服务器，请点击启动按钮');
    return;
  }
  if(!msg) {
    alert('请输入消息');
    return;
  }
  var json = {
    "userId": username,
    "msg": msg,
    "type": "message"
  };

  send(JSON.stringify(json));
}

function startLocalVideo() {
  localvideo = document.getElementById('localvideo');
  remotevideo = document.getElementById('remotevideo');
  try {
    getUserMedia({video:true, audio:false}, function(stream){
      localstream = stream;
      attachMediaStream(localvideo, stream);
      pc = RTCPeerConnection();
      pc.addStream(stream);
      pc.onaddstream = function(e) {
        attachMediaStream(remotevideo, e.stream);
        remotestream = e.stream;
      };

      pc.createOffer(function(offer){
        trace("Creating offer " + JSON.stringify(offer));
        pc.setLocalDescription(offer, function(){
          userinfo = {"from": username, 'to': remotename, "type":"offer", "offer": offer};
          console.log('userinfo:' + JSON.stringify(userinfo))
          send(JSON.stringify(userinfo));
        });
      });
    }, function(error){
      console.error(error);
    });
  } catch (e) {
    console.error(e);
  }
}

function requestCall() {
  remotename = $('#remotename').val();
  if(!remotename) {
    alert('请输入要请求人的用户名！');
    return;
  }

  startLocalVideo();
}

function acceptCall(offer) {
  trace("offer:" + JSON.stringify(offer));
  localvideo = document.getElementById('localvideo');
  remotevideo = document.getElementById('remotevideo');
  try {
    getUserMedia({video:true, audio:false}, function(stream){
      localstream = stream;
      attachMediaStream(localvideo, stream);
      pc = RTCPeerConnection();
      pc.addStream(stream);
      pc.onaddstream = function(event){
        trace('add stream remote');
        attachMediaStream(remotevideo, event.stream);
        remotestream = event.stream;
      };
      pc.setRemoteDescription(offer.offer);
      pc.createAnswer(function(answer){
        trace('created answer:' + JSON.stringify(answer));

        pc.setLocalDescription(answer);
        userinfo = {"from": offer.to, 'to':offer.from, "type":"answer", "answer": answer};
        send(JSON.stringify(userinfo));
      });
    }, function(error){
      console.error(error);
    });
  } catch (e) {
    console.error(e);
  }

}

function stopLocalVideo() {
  if(localvideo) {
    localvideo.stop();
  }
}

// window.onbeforeunload = function() {
//   socket.send('quit');
//   socket.close();
//   socket = null;
// }


function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function error(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.error((performance.now() / 1000).toFixed(3) + ": " + text);
}