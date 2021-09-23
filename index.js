
const { getImageOnIpfs, createImageUrlFromUint8Array } = require("./ipfs");

class GxCertCacheManager {
  constructor(client) {
    this.client = client;
    this.profiles = {};
    this.certIdToUserCerts = {};
    this.userCerts = {};
    this.groups = {};
    this.groupsToBelongTo = {};
    this.certificates = {};
  }
  async getProfile(address, dispatch, refresh, depth) {
    if (!refresh && address in this.profiles) {
      return this.profiles[address];
    }
    const profile = await this.client.getProfile(address);
    if (depth.includes("image")) {
      let imageUrl;
      try {
        imageUrl = await getImageOnIpfs(profile.icon);
        profile.imageUrl = imageUrl;
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
  async getIssuedUserCerts(certId, dispatch, refresh, depth) {
    if (!refresh && certId in this.certIdToUserCerts) {
      return this.certIdToUserCerts[certId];
    }
    let userCerts = await this.client.getIssuedUserCerts(certId);
    if ("certificate" in depth) {
      const _userCerts = [];
      for (const userCert of userCerts) {
        const _userCert = { ...userCert };
        if (!refresh && userCert.certId in this.certificates) {
          _userCert.certificate = this.certificates[userCert.certId];
        } else {
          const cert = await this.client.getCert(userCert.certId);
          _userCert.certificate = cert;
        }
        if ("certificateImage" in depth) {
          try {
            const imageUrl = await getImageOnIpfs(_userCert.certificate.image);
            _userCert.certificate.imageUrl = imageUrl;
          } catch(err) {
            console.error(err);
          }
        }
        _userCerts.push(_userCert);
      }
      userCerts = _userCerts;
    }
    for (const userCert of userCerts) {
      if (!(userCert.userCertId in this.userCerts)) {
        this.userCerts[userCert.userCertId] = userCert;
      }
    }
    this.certIdToUserCerts[certId] = userCerts;
    dispatch({
      type: "UPDATE_USER_CERT_CACHE",
      payload: this.userCerts,
    });
    dispatch({
      type: "UPDATE_ISSUED_USER_CERT_CACHE",
      payload: this.certIdToUserCerts,
    });
    return userCertsWithCert;
  }
  async getGroups(address, dispatch, refresh) {
    if (!refresh && address in this.groupsToBelongTo) {
      return this.groupsToBelongTo[address];
    }
    const groups = await this.client.getGroups(address);
    this.groupsToBelongTo[address] = groups;
    dispatch({
      type: "UPDATE_GROUPS_TO_BELONG_TO_CACHE",
      payload: this.groupsToBelongTo,
    });
    return groups;
  }
  async getGroup(groupId, dispatch, refresh) {
    if (!refresh && groupId in this.groups) {
      return this.groups[groupId];
    }
    const group = await this.getGroup(groupId);
    this.groups[groupId] = group;
    dispatch({
      type: "UPDATE_GROUP_CACHE",
      payload: this.groups,
    });
    return group;
  }

}

module.exports = GxCertCacheManager;
