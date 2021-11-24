const IpfsHttpClient = require("ipfs-http-client");

const IPFS = function(ipfsConfig) {
  const ipfs = IpfsHttpClient(ipfsConfig);
  this.postCertificate = async function(blob) {
    const response = await ipfs.add(blob);
    if (response) {
      return response.path;
    }
    throw new Error("couldn't post the certificate to IPFS network.");
  }
  this.postText = async function(text) {
    const response = await ipfs.add(text);
    if (response) {
      return response.path;
    }
    throw new Error("couldn't post the text to IPFS network.");
  }

  this.createImageUrlFromUint8Array = function (arr) {
    const blob = new Blob([arr]);
    const urlCreator = window.URL || window.webkitURL;
    const imageUrl = urlCreator.createObjectURL(blob);
    return imageUrl;
  }
  this.concatBuffer = function (buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  };

  this.getImageOnIpfs = async function(ipfsHash) {
    const response = await ipfs.get(ipfsHash);
    for await (const data of response) {
      console.log(data);
      let content = new ArrayBuffer(0);
      for await (const chunk of data.content) {
        content = this.concatBuffer(content, chunk);
      }
      const url = this.createImageUrlFromUint8Array(content);
      return url;
    }
    return null;
  }

  this.uintToString = function(array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while (i < len) {
      c = array[i++];
      switch (c >> 4) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
          // 0xxxxxxx
          out += String.fromCharCode(c);
          break;
        case 12:
        case 13:
          // 110x xxxx   10xx xxxx
          char2 = array[i++];
          out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
          break;
        case 14:
          // 1110 xxxx  10xx xxxx  10xx xxxx
          char2 = array[i++];
          char3 = array[i++];
          out += String.fromCharCode(
            ((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0)
          );
          break;
      }
    }
    return out;
  }
  this.getTextOnIpfs = async function (ipfsHash) {
    const response = await ipfs.get(ipfsHash);
    for await (const data of response) {
      console.log(data);
      let content = new ArrayBuffer(0);
      for await (const chunk of data.content) {
        content = concatBuffer(content, chunk);
      }
      return this.uintToString(new Uint8Array(content));
    }
    return null;
  }
}

module.exports = IPFS;
