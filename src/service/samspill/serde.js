
class JsonSerde {
  async encode(message){
    return JSON.stringify(message);
  }

  async decode(data) {
    return JSON.parse(data);
    // try {
    // } catch(err) {
    //   console.error(data);
    // }
  }
}


export class TargetedJsonSerde extends JsonSerde {
  constructor(id){
    super();
    this.id = id;
  }
  async decode(data) {
    let {target, ...message} = await super.decode(data);
    if(target != null && target != this.id){
      return null;
    } else return message;
  }
}

const encoder = new TextEncoder(); // always utf-8
const decoder = new TextDecoder(); // always utf-8

const RSA_OPTIONS = {
  name: "RSA-OAEP",
  hash: {name: "SHA-256"},
};

class SomewhatSecureJsonSerde extends JsonSerde {
  constructor(publicKey, privateKey, signingKey) {
    super();
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.signingKey = signingKey;
  }

  async wrapPersonalPublicKey(targetPublicKey){
    let wrapped = await crypto.subtle.wrapKey(
      "raw",
      this.publicKey,
      targetPublicKey, 
      RSA_OPTIONS
    );
    return wrapped;
  }

  async encode({target, ...message}){
    if(!target){
      return await super.encode(message);
    }
    let publicKey = await crypto.subtle.importKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      target,
      RSA_OPTIONS,
      false,
      ["encrypt"]
    );
    let data = await super.encode(message);
    let encrypted = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      encoder.encode(data) //ArrayBuffer of the data
    );
    let signature = await crypto.subtle.sign(
      {
        name: "HMAC",
      },
      this.signingKey,
      encrypted
    );
    return await super.encode({
      encrypted: decoder.decode(encrypted),
      signature: decoder.decode(signature)
    });
  }

  async decode(data, privateKey, signingKey) {
    let {encrypted, signature, ...rest} = await super.decode(data);
    if(!encrypted){
      return rest;
    }
    let verified = await crypto.subtle.verify(
      {
        name: "HMAC"
      },
      signingKey,
      encoder.encode(signature)
    );
    if(!verified){
      return null;
    }
    let decrypted = await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      this.privateKey,
      encoder.encode(encrypted)
    );
    return await super.decode(decoder.decode(decrypted));
  }
}






