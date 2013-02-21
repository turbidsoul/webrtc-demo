#coding:utf8

from twisted.internet import reactor
from twisted.web import server, static
from twisted.web.resource import Resource


class EventsHandler(Resource):
	def render(self, request):
		print request
		request.responseHeaders.addRawHeader('Content-Type', "text/event-stream")
		return '200'

class OfferHandler(Resource):
	def render(self, request):
		print request
		request.responseHeaders.addRawHeader('Content-Type', "text/event-stream")
		return "200"

class AnswerHandler(Resource):
	def render(self, request):
		print request
		request.responseHeaders.addRawHeader('Content-Type', "text/event-stream")
		return '200'

class ResourceHandler(Resource):
	def __init__(self, filename, *args):
		self.rst = open(filename).read()

	def render(self, request):
		return self.rst


class Server(Resource):
	def __init__(self, urls):
		Resource.__init__(self);
		self.putChild("", self);
		self.putChild('offer', OfferHandler())
		self.putChild('events', EventsHandler())
		self.putChild('answer', AnswerHandler())
		resource = static.File("./")
		resource.processors = {
			'.html': ResourceHandler,
			'.js': ResourceHandler,
			'.css': ResourceHandler
		}
		resource.indexNames = ['index.html']
		self.putChild('static', resource)

	def render(self, request):
		return "Hello, World!"

urls = {}
port = 9000
reactor.listenTCP(port, server.Site(Server(urls)))
print "listen", '192.168.1.196:' + str(port)
reactor.run()



