

export function newId(segments = 4) {
  const array = new Uint32Array(segments);
  crypto.getRandomValues(array);
  let id = "";
  for (let i = 0; i < array.length; i++) {
    id += (i ? "-" : "") + array[i].toString(36);
  }
  return id;
}

export function generateAlphabeticalId(letters = 64, alphabet="ABCDEFGHIJKLMNOPQRSTUVWXY"){
  const array = new Uint8Array(letters);
  crypto.getRandomValues(array);
  let id = "";
  for (let i = 0; i < array.length; i++) {
    id += alphabet[array[i] % alphabet.length];
  }
  return id;
}

export function arrayBufferToAlnum(buffer){
  return Array.from(new Uint8Array(buffer)).reduce((x,b) => (x<<8n) + BigInt(b), 0n).toString(36).padStart(50,0);
}
export function alnumToArrayBuffer(alnum){
  let num = alnum.split("").map(l => BigInt(parseInt(l, 36))).reduce((a,b) => a * 36n + b, 0n);
  let buffer = new Uint8Array(Math.floor((36n ** BigInt(alnum.length)).toString(2).length / 8));
  for(let i = buffer.length - 1; i >= 0; i--){
    buffer[i] = parseInt(num % 256n);
    num >>= 8n;
  }
  return buffer;
}

export async function generateKeyId(){
  let key = await crypto.subtle.generateKey(
    {
        name: "AES-GCM",
        length: 256, //can be  128, 192, or 256
    },
    true, //whether the key is extractable (i.e. can be used in exportKey)
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
  );
  let raw = await crypto.subtle.exportKey(
      "raw", //can be "jwk" or "raw"
      key //extractable must be true
  )
  return arrayBufferToAlnum(raw);
}


export async function keyIdToActualKey(keyId){
  let rawKeyData = alnumToArrayBuffer(keyId).buffer;
  return await crypto.subtle.importKey(
      "raw", //can be "jwk" or "raw"
      rawKeyData,
      {   //this is the algorithm options
          name: "AES-GCM",
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
  );
}

export async function hashPassword(password, hostPublicKeyId){
  await crypto.subtle.digest(
      {
          name: "SHA-512",
      },
      new Uint8Array(password + hostPublicKeyId) //The data you want to hash as an ArrayBuffer
  )
}

export async function publicKeyIdToActualKey(publicKeyId){
  let publicKeyBuffer = alnumToArrayBuffer(publicKeyId).buffer;
  return await crypto.subtle.importKey(
    "spki", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    publicKeyBuffer,
    {   //these are the algorithm options
        name: "RSA-OAEP",
        hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    true, //whether the key is extractable (i.e. can be used in exportKey)
    ["wrapKey"] //"encrypt" or "wrapKey" for public key import or
                //"decrypt" or "unwrapKey" for private key imports
  )
}
const RSA_CONFIG = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: {name: "SHA-256"},
};

export async function wrapKeyIdForHost(keyId, publicKeyId){
  let key = await keyIdToActualKey(keyId);
  let publicKey = await publicKeyIdToActualKey(publicKeyId);
  let wrappedKey = await crypto.subtle.wrapKey(
      "raw", //can be "jwk" or "raw"
      key,
      publicKey, //the private key with "unwrapKey" usage flag
      RSA_CONFIG
  );
  return arrayBufferToAlnum(wrappedKey);
}
export async function unwrapKeyIdForHost(keyId, privateKey){
  let rawKeyData = alnumToArrayBuffer(keyId).buffer;
  return await crypto.subtle.unwrapKey(
      "raw", //can be "jwk" or "raw"
      rawKeyData,
      privateKey, //the private key with "unwrapKey" usage flag
      RSA_CONFIG,
      {   //this is the algorithm options
          name: "AES-GCM",
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
  );
}

export async function generateHostKeyPair(roomKey){
  let {privateKey, publicKey} = await crypto.subtle.generateKey(
    RSA_CONFIG,
    true, //whether the key is extractable (i.e. can be used in exportKey)
    ["wrapKey", "unwrapKey",] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
  );
  let exportablePublicKey;
  if(roomKey){
    let wrappingKey = await keyIdToActualKey(roomKey);
    exportablePublicKey = await crypto.subtle.wrapKey(
      "spki", //can be "jwk", "raw", "spki", or "pkcs8"
      publicKey, //the key you want to wrap, must be able to export to above format
      wrappingKey, //the AES-GCM key with "wrapKey" usage flag
      {   //these are the wrapping key's algorithm options
        name: "AES-GCM",

        //Don't re-use initialization vectors!
        //Always generate a new iv every time your encrypt!
        //Recommended to use 12 bytes length
        iv: window.crypto.getRandomValues(new Uint8Array(12)),

        //Additional authentication data (optional)
        // additionalData: ArrayBuffer,

        //Tag length (optional)
        tagLength: 128, //can be 32, 64, 96, 104, 112, 120 or 128 (default)
      }
    );
  } else {
    exportablePublicKey = await crypto.subtle.exportKey(
      "spki",
      publicKey
    );
  }
  return {
    privateKey,
    publicKey: arrayBufferToAlnum(exportablePublicKey)
  }
}


const enc = new TextEncoder(); // always utf-8
const dec = new TextDecoder(enc.encoding); // always utf-8

export async function encryptSymmetric(data, key){
  let iv = crypto.getRandomValues(new Uint8Array(12))
  let buffer = await crypto.subtle.encrypt(
      {
          name: "AES-GCM",

          //Don't re-use initialization vectors!
          //Always generate a new iv every time your encrypt!
          //Recommended to use 12 bytes length
          iv,

          //Tag length (optional)
          tagLength: 128, //can be 32, 64, 96, 104, 112, 120 or 128 (default)
      },
      key, //from generateKey or importKey above
      enc.encode(data).buffer //ArrayBuffer of the data
  );
  return [ab2str(buffer), ab2str(iv)];
}
export async function decryptSymmetric(data, iv, key){
  let buffer = await crypto.subtle.decrypt(
      {
          name: "AES-GCM",
          iv: str2ab(iv), //The initialization vector you used to encrypt
          tagLength: 128, //The tagLength you used to encrypt (if any)
      },
      key, //from generateKey or importKey above
      str2ab(data) //ArrayBuffer of the data
  );
  return dec.decode(buffer);
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}
function str2ab(str) {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/*export async function encryptAsymmetric(data, publicKeyId){
  let publicKey = await publicKeyIdToActualKey(publicKeyId);
  let buffer = await crypto.subtle.encrypt(
      {
          name: "RSA-OAEP",
          //label: Uint8Array([...]) //optional
      },
      publicKey,
      enc.encode(data).buffer
  );
  return ab2str(buffer);
}

export async function decryptAsymmetric(data, privateKey){
  let buffer = await crypto.subtle.decrypt(
      {
          name: "RSA-OAEP",
          //label: Uint8Array([...]) //optional
      },
      privateKey,
      str2ab(data)
  );
  return dec.decode(buffer);
}*/