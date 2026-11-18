/* QR encoder: Kazuhiko Arase, MIT license (http://www.opensource.org/licenses/mit-license.php). "QR Code" is a registered trademark of DENSO WAVE INCORPORATED. */
var QRLib = (function () {
  var defs = {}, cache = {};
  function req(n) { n = n.replace("./", ""); if (!cache[n]) { var m = { exports: {} }; cache[n] = m; defs[n](m, m.exports, req); } return cache[n].exports; }
  defs["QRMode"] = function (module, exports, require) {
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

  };
  defs["QRErrorCorrectLevel"] = function (module, exports, require) {
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


  };
  defs["QRMaskPattern"] = function (module, exports, require) {
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

  };
  defs["QRMath"] = function (module, exports, require) {
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

  };
  defs["QRPolynomial"] = function (module, exports, require) {
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

  };
  defs["QR8bitByte"] = function (module, exports, require) {
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

  };
  defs["QRBitBuffer"] = function (module, exports, require) {
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

  };
  defs["QRRSBlock"] = function (module, exports, require) {
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

  };
  defs["QRUtil"] = function (module, exports, require) {
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

  };
  defs["index"] = function (module, exports, require) {


















var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

  };
  return { QRCode: req("index"), ErrorLevel: req("QRErrorCorrectLevel") };
})();
(function () {
  'use strict';
  var S = 2;
  var DISPLAY = '"Young Serif", Georgia, serif';
  var BODY = '"DM Sans", system-ui, sans-serif';

  var LAYOUTS = {
    strip4: { label: 'Strip 4', n: 4, cols: 1, rows: 4, cw: 440, ch: 330, gap: 20, pad: 40, foot: 150, maxW: 340 },
    strip3: { label: 'Strip 3', n: 3, cols: 1, rows: 3, cw: 440, ch: 330, gap: 20, pad: 40, foot: 150, maxW: 340 },
    duo:    { label: 'Strip 2', n: 2, cols: 1, rows: 2, cw: 440, ch: 330, gap: 20, pad: 40, foot: 150, maxW: 340 },
    solo:   { label: 'Polaroid', n: 1, cols: 1, rows: 1, cw: 440, ch: 440, gap: 0, pad: 40, foot: 190, maxW: 360 },
    grid:   { label: 'Kotak 2×2', n: 4, cols: 2, rows: 2, cw: 300, ch: 300, gap: 16, pad: 36, foot: 140, maxW: 460 }
  };
  var FILTERS = [
    { id: 'normal', label: 'Normal' },
    { id: 'latte', label: 'Latte' },
    { id: 'mono', label: 'Hitam putih' },
    { id: 'sepia', label: 'Sepia' },
    { id: 'retro', label: 'Retro' },
    { id: 'cerah', label: 'Cerah' }
  ];
  var PATCHES = [
    { id: 'cup', label: 'Cangkir' },
    { id: 'bean', label: 'Biji kopi' },
    { id: 'heart', label: 'Hati' },
    { id: 'none', label: 'Tanpa' }
  ];
  var STARS = [
    [0.07, 0.035, 18, -0.25, 0], [0.93, 0.06, 13, 0.3, 1], [0.07, 0.2, 12, 0.4, 2],
    [0.93, 0.31, 19, -0.3, 0], [0.07, 0.46, 16, 0.2, 1], [0.93, 0.57, 12, 0.5, 2],
    [0.07, 0.72, 19, -0.4, 0], [0.93, 0.82, 14, 0.1, 1], [0.05, 0.94, 13, 0.35, 2]
  ];

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d');
  var tmp = document.createElement('canvas');
  var state = {
    layout: 'strip4', filter: 'latte', frame: 'krem', caption: 'ChocoSnap',
    date: true, mirror: false, stars: true, patch: 'cup', timer: 3,
    qrOn: false, qrUrl: '', slots: []
  };

  /* ---------- small helpers ---------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  /* ---------- stickers: speckled stars and felt patches ---------- */
  function starPath(x, cx, cy, r, rot) {
    x.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.48 : r;
      var px = cx + Math.cos(a) * rr2, py = cy + Math.sin(a) * rr2;
      if (i) x.lineTo(px, py); else x.moveTo(px, py);
    }
    x.closePath();
  }
  function drawStar(x, cx, cy, r, rot, base, speck, seed) {
    x.save();
    starPath(x, cx, cy, r, rot);
    x.fillStyle = base; x.fill();
    x.lineJoin = 'round'; x.lineWidth = Math.max(2, r * 0.16); x.strokeStyle = base; x.stroke();
    x.clip();
    var rnd = rng(seed);
    x.fillStyle = speck;
    var base2 = x.globalAlpha;
    for (var k = 0; k < Math.round(r * 1.1); k++) {
      var a = rnd() * 6.283, d = Math.sqrt(rnd()) * r * 0.9;
      x.globalAlpha = base2 * (0.15 + rnd() * 0.28);
      x.beginPath();
      x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.5 + rnd() * r * 0.05, 0, 6.283);
      x.fill();
    }
    x.restore();
  }
  function starPairs(dark) {
    return dark
      ? [['#C08552', '#F3E9DC'], ['#F3E9DC', '#C08552'], ['#E0B58A', '#5E3023']]
      : [['#5E3023', '#C08552'], ['#895737', '#F3E9DC'], ['#5E3023', '#F3E9DC']];
  }

  /* felt patch kinds, drawn in a 0..100 box. Each part: path, margin width, optional stroke-only body, stitched. */
  function feltParts(kind) {
    if (kind === 'bean') {
      var bean = new Path2D(); bean.ellipse(50, 52, 29, 41, 0.45, 0, Math.PI * 2);
      return [{ p: bean, m: 14, fill: true, stitch: true }];
    }
    if (kind === 'heart') {
      return [{ p: new Path2D('M50 90 C8 58 10 24 32 20 C42 18 50 26 50 34 C50 26 58 18 68 20 C90 24 92 58 50 90 Z'), m: 14, fill: true, stitch: true }];
    }
    return [
      { p: new Path2D('M14 38 L74 38 L70 72 Q68 86 54 86 L34 86 Q20 86 18 72 Z'), m: 14, fill: true, stitch: true, speck: true },
      { p: new Path2D('M8 90 L90 90 Q96 90 96 94 Q96 98 90 98 L8 98 Q2 98 2 94 Q2 90 8 90 Z'), m: 14, fill: true, stitch: true },
      { p: new Path2D('M73 47 Q96 45 92 62 Q89 76 69 72'), m: 20, body: 11, stitch: true, thin: true }
    ];
  }
  function face(x, ex1, ex2, ey, sx, sy) {
    x.fillStyle = '#5E3023'; x.strokeStyle = '#5E3023';
    x.beginPath(); x.arc(ex1, ey, 2.8, 0, 6.283); x.fill();
    x.beginPath(); x.arc(ex2, ey, 2.8, 0, 6.283); x.fill();
    x.lineWidth = 2.6; x.beginPath(); x.arc(sx, sy, 7, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
    x.fillStyle = '#C08552'; x.globalAlpha = 0.55;
    x.beginPath(); x.arc(ex1 - 7, ey + 8, 4.4, 0, 6.283); x.fill();
    x.beginPath(); x.arc(ex2 + 7, ey + 8, 4.4, 0, 6.283); x.fill();
    x.globalAlpha = 1;
  }
  function drawPatch(x, cx, cy, size, rot, kind) {
    var k = size / 100, parts = feltParts(kind);
    x.save();
    x.translate(cx, cy); x.rotate(rot); x.scale(k, k); x.translate(-50, -52);
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.shadowColor = 'rgba(36,20,16,0.38)'; x.shadowBlur = 10; x.shadowOffsetY = 4;
    x.strokeStyle = '#FFFAF2';
    parts.forEach(function (q) { x.lineWidth = q.m; x.stroke(q.p); });
    x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
    x.fillStyle = '#F6EBDB'; x.strokeStyle = '#F6EBDB';
    parts.forEach(function (q) {
      if (q.fill) x.fill(q.p);
      if (q.body) { x.lineWidth = q.body; x.stroke(q.p); }
    });
    parts.forEach(function (q) {
      if (!q.speck) return;
      x.save(); x.clip(q.p);
      var rnd = rng(11); x.fillStyle = '#895737';
      for (var i = 0; i < 60; i++) {
        x.globalAlpha = 0.06 + rnd() * 0.1;
        x.beginPath(); x.arc(14 + rnd() * 60, 38 + rnd() * 48, 0.4 + rnd() * 0.9, 0, 6.283); x.fill();
      }
      x.restore();
    });
    x.strokeStyle = '#5E3023'; x.setLineDash([6, 5]);
    parts.forEach(function (q) { if (q.stitch) { x.lineWidth = q.thin ? 2 : 2.4; x.stroke(q.p); } });
    x.setLineDash([]);
    if (kind === 'bean') {
      x.save(); x.translate(50, 52); x.rotate(0.45); x.translate(-50, -52);
      x.strokeStyle = '#895737'; x.lineWidth = 3.2;
      x.stroke(new Path2D('M50 14 Q57 26 50 34'));
      x.stroke(new Path2D('M50 70 Q43 80 50 90'));
      x.restore();
      face(x, 41, 60, 48, 50, 54);
    } else if (kind === 'heart') {
      face(x, 40, 60, 50, 50, 56);
    } else {
      x.strokeStyle = '#895737'; x.lineWidth = 3.4;
      ['M30 30 Q23 22 30 15 Q37 8 30 1', 'M44 30 Q37 22 44 15 Q51 8 44 1', 'M58 30 Q51 22 58 15 Q65 8 58 1']
        .forEach(function (d) { x.stroke(new Path2D(d)); });
      face(x, 34, 54, 58, 44, 62);
    }
    x.restore();
  }
  function drawHeaderArt() {
    var m = $('mascot').getContext('2d');
    m.clearRect(0, 0, 208, 208);
    drawPatch(m, 104, 106, 164, -0.05, 'cup');
    var c = $('deco'), x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    var pairs = starPairs(isDark());
    [[60, 64, 42, -0.2, 0], [170, 40, 20, 0.3, 1], [236, 118, 28, -0.35, 2],
     [330, 66, 18, 0.15, 0], [404, 150, 30, 0.4, 1], [472, 60, 14, -0.1, 2]]
      .forEach(function (s, i) { var p = pairs[s[4]]; drawStar(x, s[0], s[1], s[2], s[3], p[0], p[1], i + 3); });
  }

  /* ---------- frames ---------- */
  function solid(c) { return function (x, W, H) { x.fillStyle = c; x.fillRect(0, 0, W, H); }; }
  function paintPolka(x, W, H) {
    solid('#F3E9DC')(x, W, H);
    x.fillStyle = 'rgba(192,133,82,0.55)';
    var s = 46;
    for (var r = 0, y = s / 2; y < H + s; y += s / 2, r++) {
      for (var cx = (r % 2 ? s : s / 2); cx < W + s; cx += s) { x.beginPath(); x.arc(cx, y, 8, 0, 6.283); x.fill(); }
    }
  }
  function paintGingham(x, W, H) {
    solid('#F3E9DC')(x, W, H);
    var s = 34;
    x.fillStyle = 'rgba(137,87,55,0.30)';
    for (var i = 0; i * s < W; i += 2) x.fillRect(i * s, 0, s, H);
    for (var j = 0; j * s < H; j += 2) x.fillRect(0, j * s, W, s);
  }
  function paintStripes(x, W, H) {
    solid('#F3E9DC')(x, W, H);
    x.fillStyle = 'rgba(192,133,82,0.5)';
    for (var i = 0; i * 28 < W; i += 2) x.fillRect(i * 28, 0, 28, H);
  }
  function heart(x, cx, cy, s) {
    x.beginPath();
    x.moveTo(cx, cy + s * 0.9);
    x.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.8, cy - s * 1.1, cx, cy - s * 0.35);
    x.bezierCurveTo(cx + s * 0.8, cy - s * 1.1, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
    x.closePath();
  }
  function paintHearts(x, W, H) {
    solid('#F3E9DC')(x, W, H);
    x.fillStyle = 'rgba(192,133,82,0.5)';
    var s = 52;
    for (var r = 0, y = 26; y < H + s; y += s, r++) {
      for (var cx = (r % 2 ? s : s / 2); cx < W + s; cx += s) { heart(x, cx, y, 10); x.fill(); }
    }
  }
  function paintStitch(x, W, H) {
    solid('#F3E9DC')(x, W, H);
    x.fillStyle = '#C08552';
    var i;
    for (i = 12; i < W - 6; i += 24) { x.beginPath(); x.arc(i, 8, 9, 0, 6.283); x.fill(); x.beginPath(); x.arc(i, H - 8, 9, 0, 6.283); x.fill(); }
    for (i = 12; i < H - 6; i += 24) { x.beginPath(); x.arc(8, i, 9, 0, 6.283); x.fill(); x.beginPath(); x.arc(W - 8, i, 9, 0, 6.283); x.fill(); }
    x.strokeStyle = 'rgba(137,87,55,0.55)'; x.lineWidth = 2; x.setLineDash([6, 5]);
    x.strokeRect(24, 24, W - 48, H - 48);
    x.setLineDash([]);
  }
  function paintStarfield(x, W, H) {
    solid('#5E3023')(x, W, H);
    var rnd = rng(5), cols = ['#C08552', '#E0B58A', '#F3E9DC'];
    x.save();
    x.globalAlpha = 0.8;
    for (var k = 0; k < 70; k++) {
      var cx = rnd() * W, cy = rnd() * H, r = 4 + rnd() * 8, c = cols[k % 3];
      drawStar(x, cx, cy, r, rnd() * 1.2, c, '#5E3023', k + 21);
    }
    x.restore();
  }
  function paintChoco(x, W, H) {
    solid('#4F271B')(x, W, H);
    var s = 56, i, j;
    for (j = 0; j * s < H; j++) {
      for (i = 0; i * s < W; i++) {
        var tx = i * s + 3, ty = j * s + 3, tw = s - 6;
        x.fillStyle = '#693827'; x.fillRect(tx, ty, tw, tw);
        x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(tx, ty, tw, 3); x.fillRect(tx, ty, 3, tw);
        x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(tx, ty + tw - 3, tw, 3); x.fillRect(tx + tw - 3, ty, 3, tw);
      }
    }
  }
  function paintFilm(x, W, H) {
    solid('#1D100B')(x, W, H);
    x.fillStyle = 'rgba(243,233,220,0.85)';
    for (var y = 14; y < H - 10; y += 40) { rr(x, 13, y, 14, 22, 4); x.fill(); rr(x, W - 27, y, 14, 22, 4); x.fill(); }
  }
  var FRAMES = [
    { id: 'krem', label: 'Krem', dark: false, paint: solid('#F3E9DC') },
    { id: 'karamel', label: 'Karamel', dark: false, paint: solid('#C08552') },
    { id: 'kopi', label: 'Kopi', dark: true, paint: solid('#895737') },
    { id: 'brownie', label: 'Brownie', dark: true, paint: solid('#5E3023') },
    { id: 'susu', label: 'Putih susu', dark: false, paint: solid('#FFFBF5') },
    { id: 'polka', label: 'Polkadot', dark: false, plate: true, paint: paintPolka },
    { id: 'kotak', label: 'Kotak-kotak', dark: false, plate: true, paint: paintGingham },
    { id: 'garis', label: 'Garis', dark: false, plate: true, paint: paintStripes },
    { id: 'hati', label: 'Hati', dark: false, plate: true, paint: paintHearts },
    { id: 'jahit', label: 'Jahitan', dark: false, paint: paintStitch },
    { id: 'bintang', label: 'Bintang', dark: true, plate: true, paint: paintStarfield },
    { id: 'coklat', label: 'Coklat batang', dark: true, paint: paintChoco },
    { id: 'film', label: 'Rol film', dark: true, noRim: true, noShadow: true, paint: paintFilm }
  ];
  var FRAME_BY_ID = {};
  FRAMES.forEach(function (f) { FRAME_BY_ID[f.id] = f; });

  /* ---------- QR codes ---------- */
  var qrCache = { text: null, m: null };
  function normalizeUrl(t) {
    t = (t || '').trim();
    if (!t) return '';
    if (!/^[a-z][a-z0-9+.\-]*:/i.test(t)) t = 'https://' + t;
    return t;
  }
  function qrMatrix(text) {
    if (qrCache.text === text) return qrCache.m;
    var m = null;
    try {
      var q = new QRLib.QRCode(-1, QRLib.ErrorLevel.M);
      q.addData(text); q.make();
      var n = q.getModuleCount();
      m = [];
      for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push(q.isDark(r, c)); m.push(row); }
    } catch (e) { m = null; }
    qrCache = { text: text, m: m };
    return m;
  }
  /* QR on a plain canvas: quiet zone of 4 modules, crisp integer modules */
  function renderQRCanvas(c, text, px) {
    var m = qrMatrix(text);
    if (!m) return false;
    var n = m.length, mod = Math.max(2, Math.floor(px / (n + 8))), sz = (n + 8) * mod;
    c.width = c.height = sz;
    var x = c.getContext('2d');
    x.fillStyle = '#FFFBF5'; x.fillRect(0, 0, sz, sz);
    x.fillStyle = '#3A1D14';
    for (var r = 0; r < n; r++) for (var cc = 0; cc < n; cc++) if (m[r][cc]) x.fillRect((cc + 4) * mod, (r + 4) * mod, mod, mod);
    return true;
  }
  /* QR plate on the strip, drawn in device pixels; returns its logical size */
  function drawQRStrip(x, m, cx, cy) {
    var n = m.length, mod = Math.max(2, Math.floor(112 * S / (n + 8))), sz = (n + 8) * mod;
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    var ox = Math.round(cx * S - sz / 2), oy = Math.round(cy * S - sz / 2);
    x.fillStyle = '#FFFBF5'; rr(x, ox, oy, sz, sz, 14 * S); x.fill();
    x.fillStyle = '#3A1D14';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (m[r][c]) x.fillRect(ox + (c + 4) * mod, oy + (r + 4) * mod, mod, mod);
    x.restore();
    return sz / S;
  }

  /* ---------- sample pictures (shown until real photos arrive) ---------- */
  function makeSample(i) {
    var c = document.createElement('canvas');
    c.width = 800; c.height = 600;
    var x = c.getContext('2d');
    var pal = [
      ['#f6e6d0', '#c08552', '#5e3023'],
      ['#e7c9a9', '#895737', '#3a1d14'],
      ['#f8e3c4', '#c08552', '#895737'],
      ['#d8b08c', '#895737', '#5e3023']
    ][i % 4];
    var g = x.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]);
    x.fillStyle = g; x.fillRect(0, 0, 800, 600);
    x.fillStyle = 'rgba(255,248,236,0.8)';
    x.beginPath(); x.arc(220 + i * 110, 190 + (i % 2) * 30, 90, 0, Math.PI * 2); x.fill();
    x.fillStyle = pal[2]; x.globalAlpha = 0.55;
    x.beginPath(); x.moveTo(0, 400 + i * 12);
    x.quadraticCurveTo(220, 290 + i * 14, 450, 410);
    x.quadraticCurveTo(640, 500, 800, 360 + i * 10);
    x.lineTo(800, 600); x.lineTo(0, 600); x.fill();
    x.globalAlpha = 0.9;
    x.beginPath(); x.moveTo(0, 480);
    x.quadraticCurveTo(260, 410 - i * 8, 520, 500);
    x.quadraticCurveTo(680, 550, 800, 470);
    x.lineTo(800, 600); x.lineTo(0, 600); x.fill();
    x.globalAlpha = 1;
    return c;
  }
  function resetSamples() {
    state.slots = [0, 1, 2, 3].map(function (i) { return { c: makeSample(i), sample: true }; });
  }

  /* ---------- loading photos ---------- */
  function normalize(src) {
    var w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    var k = Math.min(1, 1600 / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  async function loadFile(file) {
    var src;
    try {
      src = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      src = await new Promise(function (res, rej) {
        var im = new Image();
        im.onload = function () { res(im); };
        im.onerror = function () { rej(new Error('bad image')); };
        im.src = URL.createObjectURL(file);
      });
    }
    var c = normalize(src);
    if (src.close) src.close();
    return c;
  }

  /* ---------- drawing the strip ---------- */
  function cover(x, src, w, h, mirror) {
    var sr = src.width / src.height, tr = w / h, sw, sh, sx, sy;
    if (sr > tr) { sh = src.height; sw = sh * tr; sx = (src.width - sw) / 2; sy = 0; }
    else { sw = src.width; sh = sw / tr; sx = 0; sy = (src.height - sh) / 2; }
    if (mirror) { x.save(); x.translate(w, 0); x.scale(-1, 1); }
    x.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
    if (mirror) x.restore();
  }
  function applyFilter(x, w, h, f) {
    if (f === 'normal') return;
    var im = x.getImageData(0, 0, w, h), d = im.data;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var y = 0.299 * r + 0.587 * g + 0.114 * b;
      if (f === 'latte') {
        r = y + (r - y) * 0.85; g = y + (g - y) * 0.85; b = y + (b - y) * 0.85;
        r = (r - 128) * 0.92 + 128 + 18; g = (g - 128) * 0.92 + 128 + 11; b = (b - 128) * 0.92 + 128 - 2;
      } else if (f === 'mono') {
        r = g = b = (y - 128) * 1.15 + 132;
      } else if (f === 'sepia') {
        var nr = 0.393 * r + 0.769 * g + 0.189 * b;
        var ng = 0.349 * r + 0.686 * g + 0.168 * b;
        var nb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = nr; g = ng; b = nb;
      } else if (f === 'retro') {
        r = ((r - 128) * 0.86 + 128 + 20) * 0.94 + 14;
        g = ((g - 128) * 0.86 + 128 + 8) * 0.94 + 14;
        b = ((b - 128) * 0.86 + 128 - 6) * 0.94 + 14;
      } else if (f === 'cerah') {
        r = (y + (r - y) * 1.45 - 128) * 1.1 + 128;
        g = (y + (g - y) * 1.45 - 128) * 1.1 + 128;
        b = (y + (b - y) * 1.45 - 128) * 1.1 + 128;
      }
      d[i] = clamp(r); d[i + 1] = clamp(g); d[i + 2] = clamp(b);
    }
    x.putImageData(im, 0, 0);
    if (f === 'retro') {
      var rg = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      rg.addColorStop(0, 'rgba(40,20,0,0)');
      rg.addColorStop(1, 'rgba(40,20,0,0.45)');
      x.fillStyle = rg; x.fillRect(0, 0, w, h);
    }
  }

  var queued = false;
  function render() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; draw(); });
  }
  function draw() {
    var L = LAYOUTS[state.layout], spec = FRAME_BY_ID[state.frame];
    var cap = state.caption.trim();
    var hasText = !!(cap || state.date);
    var qrText = state.qrOn ? normalizeUrl(state.qrUrl) : '';
    var qm = qrText ? qrMatrix(qrText) : null;
    var W = L.pad * 2 + L.cols * L.cw + (L.cols - 1) * L.gap;
    var photosH = L.rows * L.ch + (L.rows - 1) * L.gap;
    var top = L.pad + photosH;
    var H = top + (hasText ? L.foot : L.pad) + (qm ? 150 : 0);

    cv.width = W * S; cv.height = H * S;
    cv.style.setProperty('--cw', L.maxW + 'px');
    ctx.setTransform(S, 0, 0, S, 0, 0);
    spec.paint(ctx, W, H);

    for (var i = 0; i < L.n; i++) {
      var col = i % L.cols, row = Math.floor(i / L.cols);
      var px = L.pad + col * (L.cw + L.gap), py = L.pad + row * (L.ch + L.gap);
      var slot = state.slots[i];
      tmp.width = L.cw * S; tmp.height = L.ch * S;
      var tx = tmp.getContext('2d', { willReadFrequently: true });
      cover(tx, slot.c, tmp.width, tmp.height, state.mirror && !slot.sample);
      applyFilter(tx, tmp.width, tmp.height, state.filter);
      ctx.save();
      if (!spec.noShadow) { ctx.shadowColor = 'rgba(36,20,16,0.30)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; }
      if (!spec.noRim) { ctx.fillStyle = '#FFFBF5'; ctx.fillRect(px - 4, py - 4, L.cw + 8, L.ch + 8); }
      else if (!spec.noShadow) { ctx.fillStyle = '#000'; ctx.fillRect(px, py, L.cw, L.ch); }
      ctx.restore();
      ctx.drawImage(tmp, px, py, L.cw, L.ch);
    }

    if (hasText) {
      if (spec.plate) {
        ctx.fillStyle = spec.dark ? 'rgba(58,29,20,0.92)' : 'rgba(243,233,220,0.94)';
        rr(ctx, L.pad, top + 12, W - L.pad * 2, L.foot - 30, 16); ctx.fill();
      }
      ctx.fillStyle = spec.dark ? '#F3E9DC' : '#5E3023';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var capY = state.date && cap ? top + L.foot * 0.42 : top + L.foot * 0.5;
      var dateY = cap ? top + L.foot * 0.74 : top + L.foot * 0.5;
      if (cap) {
        var size = L.cols === 2 ? 46 : 44;
        ctx.font = '400 ' + size + 'px ' + DISPLAY;
        while (ctx.measureText(cap).width > W - L.pad * 2 - 20 && size > 16) {
          size -= 2;
          ctx.font = '400 ' + size + 'px ' + DISPLAY;
        }
        ctx.fillText(cap, W / 2, capY);
      }
      if (state.date) {
        var ds = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
        ctx.font = '500 20px ' + BODY;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
        ctx.fillText(ds, W / 2, dateY);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      }
    }

    if (qm) {
      var qTop = top + (hasText ? L.foot - 6 : 16);
      var plate = drawQRStrip(ctx, qm, W / 2, qTop + 56);
      ctx.fillStyle = spec.dark ? '#F3E9DC' : '#5E3023';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 15px ' + BODY;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
      ctx.fillText('SCAN ME', W / 2, qTop + 56 + plate / 2 + 18);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }

    if (state.stars) {
      var pairs = starPairs(spec.dark);
      STARS.forEach(function (s, idx) {
        var p = pairs[s[4] % pairs.length];
        drawStar(ctx, s[0] * W, s[1] * H, s[2], s[3], p[0], p[1], idx + 7);
      });
    }
    if (state.patch !== 'none') {
      drawPatch(ctx, W - L.pad - 26, hasText ? top + 2 : top - 14, L.cols === 2 ? 90 : 96, 0.1, state.patch);
    }
    drawSlots();
    updateUi(qrText, qm);
  }

  /* ---------- slots UI ---------- */
  var slotsEl = $('slots'), slotUi = [], pending = 0;
  var fileOne = $('fileOne'), fileMany = $('fileMany');
  var busy = false, cancel = false, assetsApi = null;
  function setStatus(t) { $('status').textContent = t; }
  function flash() {
    ['flash', 'vfFlash'].forEach(function (id) {
      var f = $(id);
      f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    });
  }
  for (var si = 0; si < 4; si++) (function (i) {
    var wrap = document.createElement('div'); wrap.className = 'slot';
    var main = document.createElement('button'); main.type = 'button'; main.className = 'slot-main';
    var c = document.createElement('canvas'); c.width = 160; c.height = 120;
    var tag = document.createElement('span'); tag.className = 'tag';
    main.appendChild(c); main.appendChild(tag);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'slot-x';
    x.textContent = '×'; x.setAttribute('aria-label', 'Hapus foto ' + (i + 1));
    wrap.appendChild(main); wrap.appendChild(x); slotsEl.appendChild(wrap);
    main.addEventListener('click', function () { pending = i; fileOne.value = ''; fileOne.click(); });
    x.addEventListener('click', function () {
      state.slots[i] = { c: makeSample(i), sample: true };
      setStatus('Foto ' + (i + 1) + ' dihapus.');
      render();
    });
    slotUi.push({ wrap: wrap, main: main, c: c, tag: tag, x: x });
  })(si);

  function drawSlots() {
    var n = LAYOUTS[state.layout].n;
    for (var i = 0; i < 4; i++) {
      var s = state.slots[i], u = slotUi[i];
      var x = u.c.getContext('2d');
      x.clearRect(0, 0, 160, 120);
      cover(x, s.c, 160, 120, false);
      var off = i >= n;
      u.wrap.classList.toggle('off', off);
      u.tag.textContent = off ? 'Tidak dipakai' : s.sample ? 'Contoh' : 'Foto ' + (i + 1);
      u.x.hidden = s.sample;
      u.main.setAttribute('aria-label', 'Slot ' + (i + 1) + (s.sample ? ', masih contoh. Ketuk untuk menambah foto.' : ', terisi. Ketuk untuk mengganti foto.'));
    }
  }
  function updateUi(qrText, qm) {
    var n = LAYOUTS[state.layout].n, real = 0;
    for (var i = 0; i < n; i++) if (!state.slots[i].sample) real++;
    var need = n - real;
    $('dl').disabled = need > 0 || busy;
    $('qrBtn').disabled = need > 0 || busy;
    $('need').textContent = need > 0 ? 'Isi ' + need + ' slot lagi untuk mengunduh.' : 'Siap diunduh sebagai PNG.';
    var hint = $('qrHint');
    if (!state.qrOn) hint.textContent = 'Yang memindai akan diarahkan ke tautan ini.';
    else if (!qrText) hint.textContent = 'Isi tautan dulu supaya kode QR muncul di strip.';
    else if (!qm) hint.textContent = 'Tautan terlalu panjang untuk dijadikan kode QR.';
    else hint.textContent = 'Kode QR dicetak di bawah strip. Coba pindai pratinjau dengan kamera HP.';
  }

  /* ---------- adding photos from files ---------- */
  async function fillMany(files) {
    var imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
    if (!imgs.length) { setStatus('Berkas yang dipilih bukan gambar.'); return; }
    var order = [], rest = [];
    state.slots.forEach(function (s, i) { (s.sample ? order : rest).push(i); });
    order = order.concat(rest);
    var placed = 0;
    for (var k = 0; k < Math.min(imgs.length, 4); k++) {
      try { state.slots[order[k]] = { c: await loadFile(imgs[k]), sample: false }; placed++; } catch (e) { /* skip unreadable file */ }
    }
    setStatus(placed ? placed + ' foto ditambahkan.' + (imgs.length > 4 ? ' Hanya 4 slot yang tersedia.' : '') : 'Foto tidak bisa dibuka.');
    if (placed) flash();
    render();
  }
  fileOne.addEventListener('change', async function () {
    var f = fileOne.files && fileOne.files[0];
    if (!f) return;
    try {
      state.slots[pending] = { c: await loadFile(f), sample: false };
      setStatus('Foto ' + (pending + 1) + ' diisi.');
      flash();
    } catch (e) { setStatus('Foto tidak bisa dibuka. Coba foto lain.'); }
    render();
  });
  fileMany.addEventListener('change', function () { if (fileMany.files.length) fillMany(fileMany.files); fileMany.value = ''; });
  $('many').addEventListener('click', function () { fileMany.click(); });
  $('reset').addEventListener('click', function () { resetSamples(); setStatus('Gambar contoh dikembalikan.'); render(); });
  window.addEventListener('dragover', function (e) {
    if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) e.preventDefault();
  });
  window.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); fillMany(e.dataTransfer.files); }
  });
  function applyCapture() {
    if ($('cam').checked) fileOne.setAttribute('capture', 'user'); else fileOne.removeAttribute('capture');
  }
  $('cam').addEventListener('change', applyCapture);
  applyCapture();

  /* ---------- live camera and countdown session ---------- */
  var vid = $('vid'), stream = null, facing = 'user';
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function camFail() {
    setStatus('Kamera langsung tidak diizinkan di tampilan ini. Ketuk slot untuk memotret lewat aplikasi kamera HP.');
  }
  function stopTracks() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    vid.srcObject = null;
  }
  async function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camFail(); return; }
    $('camOn').disabled = true;
    try {
      stopTracks();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false
      });
      vid.srcObject = stream;
      await vid.play();
      vid.classList.toggle('flip', facing === 'user');
      $('camRow').hidden = true;
      $('camBox').hidden = false;
      if (facing === 'user') { state.mirror = true; $('mirror').checked = true; }
      setStatus('Kamera siap. Tekan "Mulai sesi foto".');
      render();
    } catch (e) {
      stopTracks();
      camFail();
    }
    $('camOn').disabled = false;
  }
  function stopCam() {
    cancel = true;
    stopTracks();
    $('camBox').hidden = true;
    $('camRow').hidden = false;
    setStatus('Kamera dimatikan.');
  }
  function showCount(t) {
    var c = $('count');
    c.textContent = t;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
  }
  function hideCount() { var c = $('count'); c.classList.remove('on'); c.textContent = ''; }
  async function runSession() {
    if (busy) { cancel = true; return; }
    if (!stream || !vid.videoWidth) { setStatus('Kamera belum siap.'); return; }
    busy = true; cancel = false;
    $('shoot').textContent = 'Hentikan';
    render();
    var n = LAYOUTS[state.layout].n;
    for (var i = 0; i < n && !cancel; i++) {
      for (var t = state.timer; t > 0 && !cancel; t--) { showCount(t); await sleep(1000); }
      hideCount();
      if (cancel) break;
      state.slots[i] = { c: normalize(vid), sample: false };
      flash();
      setStatus('Foto ' + (i + 1) + ' dari ' + n + ' diambil.');
      render();
      await sleep(900);
    }
    hideCount();
    var stopped = cancel;
    busy = false; cancel = false;
    $('shoot').textContent = 'Mulai sesi foto';
    if (!$('camBox').hidden) setStatus(stopped ? 'Sesi dihentikan.' : 'Sesi selesai. Pilih frame, lalu unduh.');
    render();
  }
  $('camOn').addEventListener('click', startCam);
  $('camOff').addEventListener('click', stopCam);
  $('shoot').addEventListener('click', runSession);
  $('flip').addEventListener('click', function () {
    facing = facing === 'user' ? 'environment' : 'user';
    startCam();
  });
  window.addEventListener('pagehide', stopTracks);

  /* ---------- style controls ---------- */
  function group(el, name, items, checked, onPick) {
    items.forEach(function (it) {
      var lab = document.createElement('label');
      var inp = document.createElement('input');
      inp.type = 'radio'; inp.name = name; inp.value = it.id; inp.checked = it.id === checked;
      var span = document.createElement('span');
      span.textContent = it.label;
      inp.addEventListener('change', function () { if (inp.checked) onPick(it.id); });
      lab.appendChild(inp); lab.appendChild(span); el.appendChild(lab);
    });
  }
  function drawThumb(c, spec) {
    var x = c.getContext('2d'), k = c.width / 520;
    x.setTransform(k, 0, 0, k, 0, 0);
    spec.paint(x, 520, 780);
    [40, 226, 412].forEach(function (y, i) {
      if (!spec.noRim) { x.fillStyle = '#FFFBF5'; x.fillRect(36, y - 4, 448, 178); }
      x.fillStyle = ['#E7C9A9', '#D8B08C', '#C9A27A'][i];
      x.fillRect(40, y, 440, 170);
    });
    if (spec.plate) {
      x.fillStyle = spec.dark ? 'rgba(58,29,20,0.92)' : 'rgba(243,233,220,0.94)';
      rr(x, 40, 604, 440, 120, 16); x.fill();
    }
    x.fillStyle = spec.dark ? '#F3E9DC' : '#5E3023';
    rr(x, 150, 636, 220, 22, 10); x.fill();
    rr(x, 200, 682, 120, 12, 6); x.fill();
  }
  function buildFrames() {
    var el = $('g-frame');
    FRAMES.forEach(function (spec) {
      var lab = document.createElement('label');
      var inp = document.createElement('input');
      inp.type = 'radio'; inp.name = 'frame'; inp.value = spec.id; inp.checked = spec.id === state.frame;
      inp.setAttribute('aria-label', 'Frame ' + spec.label);
      var th = document.createElement('span'); th.className = 'fthumb';
      var c = document.createElement('canvas'); c.width = 104; c.height = 156;
      th.appendChild(c);
      var nm = document.createElement('span'); nm.className = 'fname'; nm.textContent = spec.label;
      inp.addEventListener('change', function () { if (inp.checked) { state.frame = spec.id; render(); } });
      lab.appendChild(inp); lab.appendChild(th); lab.appendChild(nm); el.appendChild(lab);
      drawThumb(c, spec);
    });
  }
  group($('g-layout'), 'layout', Object.keys(LAYOUTS).map(function (k) { return { id: k, label: LAYOUTS[k].label }; }), state.layout, function (v) { state.layout = v; render(); });
  group($('g-filter'), 'filter', FILTERS, state.filter, function (v) { state.filter = v; render(); });
  group($('g-patch'), 'patch', PATCHES, state.patch, function (v) { state.patch = v; render(); });
  group($('g-timer'), 'timer', [{ id: '3', label: '3 detik' }, { id: '5', label: '5 detik' }], '3', function (v) { state.timer = Number(v); });
  buildFrames();
  $('caption').addEventListener('input', function (e) { state.caption = e.target.value; render(); });
  $('date').addEventListener('change', function (e) { state.date = e.target.checked; render(); });
  $('mirror').addEventListener('change', function (e) { state.mirror = e.target.checked; render(); });
  $('stars').addEventListener('change', function (e) { state.stars = e.target.checked; render(); });
  $('qrOn').addEventListener('change', function (e) { state.qrOn = e.target.checked; render(); });
  $('qrUrl').addEventListener('input', function (e) { state.qrUrl = e.target.value; render(); });

  var chips = $('chips');
  ['Hitung mundur otomatis', FRAMES.length + ' frame', 'Kode QR'].forEach(function (t) {
    var s = document.createElement('span'); s.className = 'chip'; s.textContent = t; chips.appendChild(s);
  });

  /* ---------- download ---------- */
  var dlApi = (window.claude && window.claude.use)
    ? Promise.resolve(window.claude.use('downloads')).catch(function () { return null; })
    : Promise.resolve(null);
  function showFallback() {
    $('fbimg').src = cv.toDataURL('image/png');
    $('fallback').hidden = false;
  }
  function anchorDownload(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function stamp() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }
  $('dl').addEventListener('click', async function () {
    draw();
    setStatus('Menyiapkan unduhan…');
    var name = 'chocosnap-' + stamp() + '.png';
    var blob = await new Promise(function (res) { cv.toBlob(res, 'image/png'); });
    if (!blob) { showFallback(); setStatus('Simpan gambar di bawah.'); return; }
    var api = await dlApi;
    if (!api) {
      anchorDownload(blob, name);
      showFallback();
      setStatus('Kalau unduhan tidak mulai, simpan gambar di bawah.');
      return;
    }
    try {
      await api.save({ filename: name, data: blob });
      $('fallback').hidden = true;
      setStatus('Strip foto disimpan.');
    } catch (e) {
      if (e && e.code === 'declined') setStatus('Unduhan dibatalkan.');
      else if (e && e.code === 'rate_limited') setStatus('Tunggu sebentar, lalu coba lagi.');
      else { showFallback(); setStatus('Unduhan langsung tidak tersedia. Simpan gambar di bawah.'); }
    }
  });

  /* ---------- QR to open the finished photo on a phone (needs the assets capability) ---------- */
  var lastAsset = null;
  ((window.claude && window.claude.use) ? Promise.resolve(window.claude.use('assets')).catch(function () { return null; }) : Promise.resolve(null))
    .then(function (a) { assetsApi = a; $('qrBtn').hidden = !a; render(); });
  $('qrBtn').addEventListener('click', async function () {
    if (!assetsApi) return;
    draw();
    setStatus('Mengunggah foto untuk membuat QR…');
    var blob = await new Promise(function (res) { cv.toBlob(res, 'image/jpeg', 0.92); });
    if (!blob) { setStatus('Gagal menyiapkan gambar.'); return; }
    try {
      if (lastAsset) { try { await assetsApi.delete(lastAsset); } catch (e) { /* old file may already be gone */ } lastAsset = null; }
      var res = await assetsApi.upload(blob, { type: 'image/jpeg' });
      lastAsset = res.id;
      var link;
      try { link = new URL(res.url, location.href).href; } catch (e) { link = res.url; }
      if (!renderQRCanvas($('qrCv2'), link, 600)) { setStatus('Tautan terlalu panjang untuk dijadikan QR.'); return; }
      $('qrLink').value = link;
      $('qrPanel').hidden = false;
      setStatus('QR siap dipindai.');
    } catch (e) {
      setStatus(e && e.code === 'quota_or_state' ? 'Ruang penyimpanan halaman penuh.' : 'QR belum bisa dibuat. Coba lagi.');
    }
  });
  $('qrCopy').addEventListener('click', function () {
    var f = $('qrLink');
    f.select();
    var done = function () { setStatus('Tautan disalin.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(f.value).then(done).catch(function () { setStatus('Tautan sudah dipilih. Salin manual.'); });
    else setStatus('Tautan sudah dipilih. Salin manual.');
  });

  /* ---------- start ---------- */
  resetSamples();
  draw();
  drawHeaderArt();
  try {
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawHeaderArt);
    new MutationObserver(drawHeaderArt).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  } catch (e) { /* theme change redraw is optional */ }
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('400 44px "Young Serif"'), document.fonts.load('500 20px "DM Sans"')]).then(render).catch(function () {});
  }
})();
