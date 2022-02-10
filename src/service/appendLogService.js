import { createSignal, observable } from 'solid-js';

async function createKeys(){
  let cryptoKeys = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048, //can be 1024, 2048, or 4096
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    true, //whether the key is extractable (i.e. can be used in exportKey)
    ["encrypt", "decrypt"] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
  );
  let signingKey = await window.crypto.subtle.generateKey(
    {
      name: "HMAC",
      hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      //length: 256, //optional, if you want your key length to differ from the hash function's block length
    },
    true, //whether the key is extractable (i.e. can be used in exportKey)
    ["sign", "verify"] //can be any combination of "sign" and "verify"
  );
  return {
    cryptoKeys,
    signingKey,
    publicKey: await crypto.subtle.exportKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      cryptoKeys.publicKey //can be a publicKey or privateKey, as long as extractable was true
    ),
    privateKey: await crypto.subtle.exportKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      cryptoKeys.privateKey //can be a publicKey or privateKey, as long as extractable was true
    ),
    signingKeyJWK: await crypto.subtle.exportKey(
      "jwk", //can be "jwk" or "raw"
      signingKey //extractable must be true
    )
  };
}

export async function createRoom(){
  const keys = await createKeys();
  console.log(keys);
  const appendLog = new EmbeddedAppendLog(keys.signingKey);
  const producer = new AppendLogProducer(appendLog, keys);
  const consumer = new AppendLogConsumer(appendLog, keys);
  consumer.subscribe((message) => {
    console.log("CONSUMER", message);
  });
  await producer.send("HOST", {
    publicKey: keys.publicKey
  });

}


function bufferToAlnum(buffer) {
  let array = new Uint8Array(buffer);
  let hex = "";
  for(let i = 0; i < array.length; i++){
    hex += ("00" + array[i].toString(16)).slice(-2);
  }
  return hex;
}
function hexToBuffer(hex) {
  let array = new Uint8Array(hex.length / 2);
  for(let i = 0; i < array.length; i++){
    array[i] = parseInt(hex[2*i] + hex[2*i+1], 16);
  }
  return array;
}
function bufferToHex(buffer) {
  let array = new Uint8Array(buffer);
  let hex = "";
  for(let i = 0; i < array.length; i++){
    hex += ("00" + array[i].toString(16)).slice(-2);
  }
  return hex;
}
function hexToBuffer(hex) {
  let array = new Uint8Array(hex.length / 2);
  for(let i = 0; i < array.length; i++){
    array[i] = parseInt(hex[2*i] + hex[2*i+1], 16);
  }
  return array;
}

const encoder = new TextEncoder();
const decoder = new TextEncoder();
function encode(string) {
  return encoder.encode(string);
}
function decode(buffer) {
  return decoder.decode(buffer);
}


class EmbeddedAppendLog {
  #signingKey;
  #log = [];
  #firstNonClearedOffset = 0;
  constructor(signingKey){
    this.#signingKey = signingKey;
  }
  async append(data, signature){
    let enc = new TextEncoder(); // always utf-8
    let verified = await crypto.subtle.verify(
      {
        name: "HMAC",
      },
      this.#signingKey,
      signature, //ArrayBuffer of the signature
      enc.encode(data).buffer //ArrayBuffer of the data
    );
    if(verified){
      this.#log.push(`${bufferToHex(signature)}:${data}`);
      return true;
    } else {
      return false;
    }
  }
  clearUntil(offset){
    offset = Math.min(offset, this.#log.length);
    while(this.#firstNonClearedOffset < offset){
      delete this.#log[this.#firstNonClearedOffset++];
    }
  }
  getFrom(offset) {
    return this.#log.slice(offset);
  }
}



class AppendLogProducer {
  #signingKey;
  #appendLog;

  constructor(appendLog, keys){
    this.#appendLog = appendLog;
    this.#signingKey = keys.signingKey;
  }
  async send(type, payload){
    let data = JSON.stringify({type, payload});
    let enc = new TextEncoder(); // always utf-8
    let signature = await crypto.subtle.sign(
      {
        name: "HMAC",
      },
      this.#signingKey,
      enc.encode(data).buffer //ArrayBuffer of the data
    );
    return await this.#appendLog.append(data, signature);
  }

  async sendEncrypted(type, payload, publicKeyJWK) {
    let data = JSON.stringify({type, payload});
    let enc = new TextEncoder(); // always utf-8
    let signature = await crypto.subtle.sign(
      {
        name: "HMAC",
      },
      this.#signingKey,
      enc.encode(data).buffer //ArrayBuffer of the data
    );
    let publicKey = await crypto.subtle.importKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      publicKeyJWK,
      {   //these are the algorithm options
          name: "RSA-OAEP",
          hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt"] //"encrypt" or "wrapKey" for public key import or
                  //"decrypt" or "unwrapKey" for private key imports
    )
    let encrypted = await crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
            //label: Uint8Array([...]) //optional
        },
        await crypto.subtle.importKey("jwk", publicKeyJWK), //from generateKey or importKey above
        hexToBuffer(data.encrypted).buffer //ArrayBuffer of the data
    );
    let enc = new TextEncoder(); // always utf-8
    return await this.#appendLog.append(data, signature);
  }
}



class AppendLogConsumer {
  #signingKey;
  #privateKey;
  #appendLog;
  #offset = 0;
  #pollSignal = createSignal(null);
  #pollObservable = observable(this.#pollSignal[0]);
  #pollingInterval = setInterval(this.poll.bind(this), 1000);

  constructor(appendLog, keys){
    this.#appendLog = appendLog;
    this.#signingKey = keys.signingKey;
    this.#privateKey = keys.cryptoKeys.privateKey;
  }

  async poll(){
    let slice = this.#appendLog.getFrom(this.#offset);
    if(slice.length > 0) {
      let enc = new TextEncoder(); // always utf-8
      this.#offset += slice.length;
      for(let i = 0; i < slice.length; i++){
        let message = slice[i];
        let index = message.indexOf(":");
        let signature = message.slice(0,index);
        let data = message.slice(index+1);
        let verified = await crypto.subtle.verify(
          {
            name: "HMAC",
          },
          this.#signingKey,
          hexToBuffer(signature).buffer, //ArrayBuffer of the signature
          enc.encode(data).buffer //ArrayBuffer of the data
        );
        console.log("VERIFIED", verified);
        let data = JSON.parse(data);
        if(data.encrypted){
          let decrypted = await crypto.subtle.decrypt(
              {
                  name: "RSA-OAEP",
                  //label: Uint8Array([...]) //optional
              },
              this.#privateKey, //from generateKey or importKey above
              hexToBuffer(data.encrypted).buffer //ArrayBuffer of the data
          );
          console.log(data, decrypted);
          data = {type, payload: decrypted}
        }
        this.#pollSignal[1](JSON.parse(data));
      }
    }
  }

  subscribe(fn){
    return this.#pollObservable.subscribe(fn);
  }
}


