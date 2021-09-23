
const { getImageOnIpfs, createImageUrlFromUint8Array } = require("./ipfs");

class GxCertCacheManager {
  constructor(clients) {
    this.clients = clients;
    this.client = clients[0];
    this.profiles = {};
    this.certIdToUserCerts = {};
    this.addressToUserCerts = {};
    this.userCerts = {};
    this.groups = {};
    this.groupsToBelongTo = {};
    this.certificates = {};
    this.images = {};
  }
  setMainClient(client) {
    this.clients[0] = client;
    this.client = client;
  }
  async getProfile(address, dispatch, refresh, depth, clientIndex) {
    if (!refresh && address in this.profiles) {
      const profile = this.profiles[address];
      if (profile.icon in this.profiles) {
        profile.imageUrl = this.profiles[profile.icon];
      }
      return profile;
    }
    let profile;
    if (clientIndex) {
      profile = await this.clients[clientIndex].getProfile(address);
    } else {
      profile = await this.client.getProfile(address);
    }
    this.profiles[address] = profile;
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
    dispatch({
      type: "UPDATE_PROFILE_CACHE",
      payload: this.profiles,
    });
    return profile;
  }
  async getReceivedUserCerts(address, dispatch, refresh, depth, clientIndex) {
    if (!refresh && address in this.addressToUserCerts) {
      let userCerts = this.addressToUserCerts[address];
      userCerts = userCerts.map(userCert => {
        if (userCert.certId in this.certificates) {
          const certificate = this.certificates[userCert.certId];
          if (certificate.image in this.images) {
            const imageUrl = this.images[certificate.image];
            certificate.imageUrl = imageUrl;
          }
          userCert.certificate = certificate;
        }
        return userCert;
      });
      return userCerts;
    }
    let userCerts;
    if (clientIndex) {
      userCerts = await this.clients[clientIndex].getReceivedUserCerts(address);
    } else {
      userCerts = await this.client.getReceivedUserCerts(address);
    }
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
        const cert = await this.getCert(userCert.certId, dispatch, refresh, depth, clientIndex);
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
  async getIssuedUserCerts(certId, dispatch, refresh, depth, clientIndex) {
    if (!refresh && certId in this.certIdToUserCerts) {
      let userCerts = this.certIdToUserCerts[certId];
      userCerts = userCerts.map(userCert => {
        if (userCert.certId in this.certificates) {
          const certificate = this.certificates[userCert.certId];
          if (certificate.image in this.images) {
            const imageUrl = this.images[certificate.image];
            certificate.imageUrl = imageUrl;
          }
          userCert.certificate = certificate;
        }
        return userCert;
      });
      return userCerts;
    }
    let userCerts;
    if (clientIndex) {
      userCerts = await this.clients[clientIndex].getIssuedUserCerts(certId);
    } else {
      userCerts = await this.client.getIssuedUserCerts(certId);
    }
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
  async getGroups(address, dispatch, refresh, clientIndex) {
    if (!refresh && address in this.groupsToBelongTo) {
      return this.groupsToBelongTo[address];
    }
    let groupIds;
    if (clientIndex) {
      groupIds = await this.clients[clientIndex].getGroupIds(address);
    } else {
      groupIds = await this.client.getGroupIds(address);
    }
    const groups = [];
    for (const groupId of groupIds) {
      const group = await this.getGroup(groupId, ()=>{}, refresh, clientIndex);
      groups.push(group);
    }
    this.groupsToBelongTo[address] = groups;
    dispatch({
      type: "UPDATE_GROUPS_CACHE",
      payload: this.groupsToBelongTo,
    });
    return groups;
  }
  async getGroup(groupId, dispatch, refresh, clientIndex) {
    if (!refresh && groupId in this.groups) {
      return this.groups[groupId];
    }
    let group;
    if (clientIndex) {
      group = await this.clients[clientIndex].getGroup(groupId);
    } else {
      group = await this.client.getGroup(groupId);
    }
    this.groups[groupId] = group;
    dispatch({
      type: "UPDATE_GROUP_CACHE",
      payload: this.groups,
    });
    return group;
  }
  async getUserCert(userCertId, dispatch, refresh, depth, clientIndex) {
    if (!refresh && userCertId in this.userCerts) {
      const userCert = this.userCerts[userCertId];
      if (userCert.certId in this.certificates) {
        const certificate = this.certificates[userCert.certId];
        if (certificate.image in this.images) {
          const imageUrl = this.images[certificate.image];
          certificate.imageUrl = imageUrl;
        }
        userCert.certificate = certificate;
      }
      return userCert;
    }
    let userCert;
    if (clientIndex) {
      userCert = await this.clients[clientIndex].getUserCert(userCertId);
    } else {
      userCert = await this.client.getUserCert(userCertId);
    }
    this.userCerts[userCertId] = userCert;
    dispatch({
      type: "UPDATE_USER_CERT_CACHE",
      payload: this.userCerts,
    });
    if (depth.includes("certificate")) {
      userCert.certificate = this.getCert(userCert.certId, dispatch, refresh, depth);
    }
    return userCert;
  }
  async getCert(certId, dispatch, refresh, depth, clientIndex) {
    if (!refresh && certId in this.certificates) {
      return this.certificates[certId];
    }
    let cert;
    if (clientIndex) {
      cert = await this.clients[clientIndex].getCert(certId);
    } else {
      cert = await this.client.getCert(certId);
    }
    this.certificates[certId] = cert;
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
