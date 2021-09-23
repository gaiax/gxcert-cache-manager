
const { getImageOnIpfs, createImageUrlFromUint8Array } = require("./ipfs");

class GxCertCacheManager {
  constructor(client) {
    this.client = client;
    this.profiles = {};
    this.certIdToUserCerts = {};
    this.addressToUserCerts = {};
    this.userCerts = {};
    this.groups = {};
    this.groupsToBelongTo = {};
    this.certificates = {};
    this.images = {};
  }
  async getProfile(address, dispatch, refresh, depth) {
    if (!refresh && address in this.profiles) {
      return this.profiles[address];
    }
    const profile = await this.client.getProfile(address);
    if (depth.includes("profileImage")) {
      let imageUrl;
      try {
        imageUrl = await getImageOnIpfs(profile.icon);
        profile.imageUrl = imageUrl;
        this.images[profile.icon] = imageUrl;
        dispatch({
          type: "UPDATE_IMAGE_CACHE",
          payload: this.images,
        });
      } catch(err) {
        console.error(err);
        profile.imageUrl = "";
      }
    }
    this.profiles[address] = profile;
    dispatch({
      type: "UPDATE_PROFILE_CACHE",
      payload: this.profiles,
    });
    return profile;
  }
  async getReceivedUserCerts(address, dispatch, refresh, depth) {
    if (!refresh && address in this.addressToUserCerts) {
      return this.addressToUserCerts[address];
    }
    let userCerts = await this.client.getReceivedUserCerts(address);
    for (const userCert of userCerts) {
      if (!(userCert.userCertId in this.userCerts)) {
        this.userCerts[userCert.userCertId] = userCert;
      }
    }
    this.addressToUserCerts[address] = userCerts;
    if (depth.includes("certificate")) {
      const _userCerts = [];
      for (const userCert of userCerts) {
        const _userCert = { ...userCert };
        const cert = await this.getCert(userCert.certId, dispatch, refresh, depth);
        _userCert.certificate = cert;
        _userCerts.push(_userCert);
      }
      userCerts = _userCerts;
    }
    dispatch({
      type: "UPDATE_USER_CERT_CACHE",
      payload: this.userCerts,
    });
    dispatch({
      type: "UPDATE_RECEIVED_USER_CERT_CACHE",
      payload: this.addressToUserCerts,
    });
    return userCerts;
  }
  async getIssuedUserCerts(certId, dispatch, refresh, depth) {
    if (!refresh && certId in this.certIdToUserCerts) {
      return this.certIdToUserCerts[certId];
    }
    let userCerts = await this.client.getIssuedUserCerts(certId);
    for (const userCert of userCerts) {
      if (!(userCert.userCertId in this.userCerts)) {
        this.userCerts[userCert.userCertId] = userCert;
      }
    }
    this.certIdToUserCerts[certId] = userCerts;
    if (depth.includes("certificate")) {
      const _userCerts = [];
      for (const userCert of userCerts) {
        const _userCert = { ...userCert };
        const cert = await this.getCert(userCert.certId, dispatch, refresh, depth);
        _userCert.certificate = cert;
        _userCerts.push(_userCert);
      }
      userCerts = _userCerts;
    }
    dispatch({
      type: "UPDATE_USER_CERT_CACHE",
      payload: this.userCerts,
    });
    dispatch({
      type: "UPDATE_ISSUED_USER_CERT_CACHE",
      payload: this.certIdToUserCerts,
    });
    return userCerts;
  }
  async getGroups(address, dispatch, refresh) {
    if (!refresh && address in this.groupsToBelongTo) {
      return this.groupsToBelongTo[address];
    }
    const groupIds = await this.client.getGroupIds(address);
    const groups = [];
    for (const groupId of groupIds) {
      const group = await this.getGroup(groupId, ()=>{}, refresh);
      groups.push(group);
    }
    return groups;
  }
  async getGroup(groupId, dispatch, refresh) {
    if (!refresh && groupId in this.groups) {
      return this.groups[groupId];
    }
    const group = await this.client.getGroup(groupId);
    this.groups[groupId] = group;
    dispatch({
      type: "UPDATE_GROUP_CACHE",
      payload: this.groups,
    });
    return group;
  }
  async getCert(certId, dispatch, refresh, depth) {
    if (!refresh && certId in this.certificates) {
      return this.certificates[certId];
    }
    const cert = await this.client.getCert(certId);
    if (depth.includes("certificateImage")) {
      try {
        const imageUrl = await getImageOnIpfs(cert.image);
        cert.imageUrl = imageUrl;
        this.images[cert.image] = imageUrl;
        dispatch({
          type: "UPDATE_IMAGE_CACHE",
          payload: this.images,
        });
      } catch(err) {
        console.error(err);
        cert.imageUrl = "";
      }
    }
    return cert;
  }

}

module.exports = GxCertCacheManager;
