

export function newId(segments = 4) {
  const array = new Uint32Array(segments);
  crypto.getRandomValues(array);
  let id = "";
  for (let i = 0; i < array.length; i++) {
    id += (i ? "-" : "") + array[i].toString(36);
  }
  return id;
}

export function arrayBufferToAlnum(buffer){
  return Array.from(new Uint8Array(buffer)).reduce((x,b) => (x<<8n) + BigInt(b), 0n).toString(36).padStart(50,0);
}
export function alnumToArrayBuffer(alnum){
  let num = alnum.split("").map(l => BigInt(parseInt(l, 36))).reduce((a,b) => a * 36n + b, 0n);
  let buffer = new Uint8Array(32);
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
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
  );
}

export async function generateHostKeyPair(roomKey){
  let {privateKey, publicKey} = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048, //can be 1024, 2048, or 4096
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    true, //whether the key is extractable (i.e. can be used in exportKey)
    ["encrypt", "decrypt"] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
  );
  let wrappingKey = await keyIdToActualKey(roomKey);
  return {
    privateKey,
    publicKey: arrayBufferToAlnum(await crypto.subtle.wrapKey(
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
    ))
  }
}
