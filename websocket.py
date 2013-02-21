#coding:utf8

from twisted.internet import reactor
from twisted.internet.protocol import Factory, Protocol

import hashlib, struct, base64, json


connections = {}

class WebSocket(Protocol):

    def __init__(self, sockets):
        self.sockets = sockets
        self.user = {}

    def connectionMade(self):
        if not self.sockets.has_key(self):
            self.sockets[self] = {}

    def dataReceived(self, msg):
        global connections
        try:
            if msg.lower().find('upgrade: websocket') != -1:
                self.hand_shake(msg)
            else:
                raw_str = self.parse_recv_data(msg)
                print str(raw_str)
                if not raw_str or len(raw_str) == 0:
                    print 'No Data'
                    return
                if raw_str == 'quit':
                    print raw_str
                    self.close()
                    return

                data = json.loads(raw_str)
                # self.users[userinfo['user']] = userinfo['offer']

                # 当有接收到第二个发送offer时，向第一个offer发送第二个offer的信息，请求视频连接
                # 第一个offer建立与第二个offer的连接，并发送自己的answer
                # 当接收到第一个answer，发送给第二个offer
                if data['type'] == 'offer':
                    to = data['to']
                    if not connections.has_key(to):
                        error = {
                            'type':'error',
                            'username':'WebSocket Server',
                            'message':'指定用户不存在'
                        }
                        self.send_data(json.dumps(error))
                        return
                    offer = {
                        'from': data['from'],
                        'to': data['to'],
                        'type':'offer',
                        'offer':data['offer']
                    }
                    print data['from'], "send offer to", data['to']
                    connections[data['to']].send_data(json.dumps(offer))
                elif data['type'] == 'answer':
                    answer = {
                        'from': data['from'],
                        'to': data['to'],
                        'type':'answer',
                        'answer':data['answer']
                    }
                    print data['from'], "send answer to", data['to']
                    connections[data['to']].send_data(json.dumps(answer))
                elif data['type'] == 'message':
                    pass
                elif data['type'] == 'connection':
                    username = data['username']
                    if (not connections.has_key(username)) and len(connections) == 2:
                        error = {
                            'type': 'error',
                            'message': '暂时支持两人视频',
                            'username':'WebSocket Server'
                        }
                        self.send_data(json.dumps(error))
                        return
                    connections[username] = self
                    self.send_data(json.dumps({'type':'message', 'message':'连接成功', 'username':'WebSocket Server'}))
                print "connections:", connections
        except Exception, e:
            print Exception,":",e
            self.send_data(json.dumps({"type": 'error', 'message': str(e)}));
            return

    def connectionLost(self, reason):
        if self.sockets.has_key(self):
            del self.sockets[self]

    def generate_token(self, key1, key2, key3):
        num1 = int("".join([digit for digit in list(key1) if digit.isdigit()]))
        spaces1 = len([char for char in list(key1) if char == " "])
        num2 = int("".join([digit for digit in list(key2) if digit.isdigit()]))
        spaces2 = len([char for char in list(key2) if char == " "])

        combined = struct.pack(">II", num1/spaces1, num2/spaces2) + key3
        return hashlib.md5(combined).digest()

    def generate_token_2(self, key):
        key = key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
        ser_key = hashlib.sha1(key).digest()

        return base64.b64encode(ser_key)

    def send_data(self, raw_str):
        if self.sockets[self]['new_version']:
            back_str = []
            back_str.append('\x81')
            data_length = len(raw_str)

            if data_length <= 125:
                back_str.append(chr(data_length))
            else:
                back_str.append(chr(126))
                back_str.append(chr(data_length >> 8))
                back_str.append(chr(data_length & 0xFF))

            back_str = "".join(back_str) + raw_str

            self.transport.write(back_str)
        else:
            back_str = '\x00%s\xFF' % (raw_str)
            self.transport.write(back_str)

    def parse_recv_data(self, msg):
        raw_str = ''
        print "msg_length", len(msg)
        if self.sockets[self]['new_version']:
            code_length = ord(msg[1]) & 127
            print "code_length:" + str(ord(msg[1]))
            if code_length == 126:
                masks = msg[4:8]
                data = msg[8:]
            elif code_length == 127:
                masks = msg[12:16]
                data = msg[16:]
            else:
                masks = msg[2:6]
                data = msg[6:]

            i = 0
            for d in data:
                raw_str += chr(ord(d) ^ ord(masks[i%4]))
                i += 1
        else:
            raw_str = msg.split("\xFF")[0][1:]

        return raw_str

    def hand_shake(self, msg):
        headers = {}
        header, data = msg.split('\r\n\r\n', 1)
        for line in header.split('\r\n')[1:]:
            key, value = line.split(": ", 1)
            headers[key] = value

        headers["Location"] = "ws://%s/" % headers["Host"]

        if headers.has_key('Sec-WebSocket-Key1'):
            key1 = headers["Sec-WebSocket-Key1"]
            key2 = headers["Sec-WebSocket-Key2"]
            key3 = data[:8]

            token = self.generate_token(key1, key2, key3)

            handshake = '\
HTTP/1.1 101 Web Socket Protocol Handshake\r\n\
Upgrade: WebSocket\r\n\
Connection: Upgrade\r\n\
Sec-WebSocket-Origin: %s\r\n\
Sec-WebSocket-Location: %s\r\n\r\n\
' %(headers['Origin'], headers['Location'])

            self.transport.write(handshake + token)

            self.sockets[self]['new_version'] = False
        else:
            key = headers['Sec-WebSocket-Key']
            token = self.generate_token_2(key)

            handshake = '\
HTTP/1.1 101 Switching Protocols\r\n\
Upgrade: WebSocket\r\n\
Connection: Upgrade\r\n\
Sec-WebSocket-Accept: %s\r\n\r\n\
' % (token)
            self.transport.write(handshake)

            self.sockets[self]['new_version'] = True

class WebSocketFactory(Factory):
    def __init__(self):
        self.sockets = {}

    def buildProtocol(self, addr):
        return WebSocket(self.sockets)

def main():
    port = 8080;
    reactor.listenTCP(port, WebSocketFactory())
    print "listen", '192.168.1.196:' + str(port)
    reactor.run()

if __name__ == '__main__':
    main()