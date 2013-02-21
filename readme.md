## WebSocket 和 WebRTC 的 demo

这里我使用python+twisted实现的WebSocket服务器，但是接收数据的解析上还很粗糙，在个别的个浏览器上发送的消息的时候服务端接收到的消息无法解析，应该是消息格式有错误。
应该不会是浏览器的问题，因为浏览器版本相同，但是在不通的机子上一个完全可以，另一个发送到服务端的消息一直都是错误的。

错误的现象是，服务端接收到的消息的第二个字节应该是254，实际上会小于254，使得无法正确得到mask-key，所以无法解析到正确的数据。

WebSocket服务端是我在网上看到的一篇文章，使用作者的源代码，简单的修改之后得到的.

*参考blog:[用Python实现一个简单的WebSocket服务器](http://blog.mycolorway.com/2011/11/22/a-minimal-python-websocket-server/)*