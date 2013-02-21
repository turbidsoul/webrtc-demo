var dataParser = {
	'draft10': function(data, parser) {
		var pkt, i = 0,
			len = 0,
			start = 0;

		// 如果不包含包头，而且数据已经解析完成
		// 则认为这个包为结束包，首字节通常为0x88
		if(data[0] != 0x81 && parser.length == 0) {
			parser.emit('close');
			parser.closing = false;
			return;
		}

		// 草案10
		// 首包会包含掩码信息
		if(data[0] == 0x81) {
			// 使用了掩码
			if(data[1] >= 0x80) {
				// 数据长度不一样，掩码位置不一样
				if(data.length < 0x84) {
					// firefox下，超过一个包长度的数据会被拆分为多个包
					// 其中首包只包含头信息，第二个字节为0xfe
					if(data[1] == 0xfe) {
						len = data.length;
						// firefox
						parser.maskData = [data[len - 4], data[len - 3], data[len - 2], data[len - 1]];
						parser.length = data[len - 5];
						for(i = len - 6; i > 1; i--) {
							parser.length += data[i] * (len - 5 - i) * 256;
						}
						console.log('firefox multi packages, length: ', parser.length);
						start = data.length;
					} else {
						// chrome
						parser.length = data[1] - 0x80;
						console.log('7bit, length: ', parser.length);
						parser.maskData = [data[2], data[3], data[4], data[5]];
						start = 6;
					}
				} else if(data.length < 0xfe80) {
					parser.length = data[2] * 256 + data[3];
					console.log('7 + 16bit, length: ', parser.length);
					parser.maskData = [data[4], data[5], data[6], data[7]];
					start = 8;
				} else {
					dparser.length = data[11];
					for(i = 10; i > 3; i--) {
						parser.length += data[i] * (11 - i) * 256;
					}
					console.log('7 + 64bit, length: ', parser.length);
					parser.maskData = [data[12], data[13], data[14], data[15]];
					start = 16;
				}

				for(i = start, len = data.length; i < len; i++) {
					parser.frameData.push(parser.maskData[(i - start) % 4] ^ data[i]);
				}
			} else {
				if(data.length < 0x80) {
					start = 2;
				} else if(data.length < 0xfe81) {
					start = 4;
				} else {
					start = 12;
				}
				// find contents
				parser.frameData = data.splice(start);
			}
			console.log('1st packge frame length: ', parser.frameData.length);
			if(parser.frameData.length == parser.length) {
				pkt = new Buffer(parser.frameData);
				// console.log(pkt.toString('utf8', 0, pkt.length));
				parser.emit('message', pkt.toString('utf8', 0, pkt.length));
				// 数据包结束，重置长度信息
				parser.frameData = [];
				parser.length = 0;
			}
			return;
		}

		// 连续的数据包
		if(parser.maskData.length) {
			// continue to parse data
			for(i = 0, l = data.length; i < l; i++) {
				parser.frameData.push(parser.maskData[i % 4] ^ data[i]);
			}
			console.log('frame length: ', parser.frameData.length);
			if(parser.frameData.length == parser.length) {
				pkt = new Buffer(parser.frameData);
				// console.log(pkt.toString('utf8', 0, pkt.length));
				parser.emit('message', pkt.toString('utf8', 0, pkt.length));
				// 数据包结束，重置长度信息
				parser.frameData = [];
				parser.length = 0;
			}
			return;
		}
	}
};