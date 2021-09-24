
const { getImageOnIpfs, createImageUrlFromUint8Array } = require("./ipfs");
const REFRESH_DEPTH = {
  NO_REFRESH: 0,
  SHALLOW: 1,
  DEEP: 2,
}

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
    let profile;
    if (refresh === REFRESH_DEPTH.NO_REFRESH && address in this.profiles) {
      profile = this.profiles[address];
    } else {
      if (clientIndex) {
        profile = await this.clients[clientIndex].getProfile(address);
      } else {
        profile = await this.client.getProfile(address);
      }
    }
    this.profiles[address] = profile;
    if (depth.includes("profileImage")) {
      let imageUrl;
      if (refresh === REFRESH_DEPTH.SHALLOW && profile.icon in this.images) {
        imageUrl = this.images[profile.icon]; 
      } else {
        try {
          imageUrl = await getImageOnIpfs(profile.icon);
          this.images[profile.icon] = imageUrl;
          dispatch({
            type: "UPDATE_IMAGE_CACHE",
            payload: this.images,
          });
        } catch(err) {
          console.error(err);
          imageUrl = "";
        }
      }
      profile.imageUrl = imageUrl;
    }
    dispatch({
      type: "UPDATE_PROFILE_CACHE",
      payload: this.profiles,
    });
    return profile;
  }
  async getReceivedUserCerts(address, dispatch, refresh, depth, clientIndex) {
    let userCerts;
    if (refresh === REFRESH_DEPTH.NO_REFRESH && address in this.addressToUserCerts) {
      userCerts = this.addressToUserCerts[address];
    } else {
      if (clientIndex) {
        userCerts = await this.clients[clientIndex].getReceivedUserCerts(address);
      } else {
        userCerts = await this.client.getReceivedUserCerts(address);
      }
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
        let cert;
        if (refresh === REFRESH_DEPTH.SHALLOW) {
          cert = await this.getCert(userCert.certId, dispatch, REFRESH_DEPTH.NO_REFRESH, depth, clientIndex);
        } else {
          cert = await this.getCert(userCert.certId, dispatch, refresh, depth, clientIndex);
        }
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
    let userCerts;
    if (refresh === REFRESH_DEPTH.NO_REFRESH && certId in this.certIdToUserCerts) {
      userCerts = this.certIdToUserCerts[certId];
    } else {
      if (clientIndex) {
        userCerts = await this.clients[clientIndex].getIssuedUserCerts(certId);
      } else {
        userCerts = await this.client.getIssuedUserCerts(certId);
      }
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
        let cert;
        if (refresh === REFRESH_DEPTH.SHALLOW) {
          cert = await this.getCert(userCert.certId, dispatch, REFRESH_DEPTH.NO_REFRESH, depth, clientIndex);
        } else {
          cert = await this.getCert(userCert.certId, dispatch, refresh, depth, clientIndex);
        }
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
    if (refresh === REFRESH_DEPTH.NO_REFRESH && address in this.groupsToBelongTo) {
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
    if (refresh === REFRESH_DEPTH.NO_REFRESH && groupId in this.groups) {
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
    let userCert;
    if (refresh === REFRESH_DEPTH.NO_REFRESH && userCertId in this.userCerts) {
      userCert = this.userCerts[userCertId];
    } else {
      if (clientIndex) {
        userCert = await this.clients[clientIndex].getUserCert(userCertId);
      } else {
        userCert = await this.client.getUserCert(userCertId);
      }
    }
    this.userCerts[userCertId] = userCert;
    dispatch({
      type: "UPDATE_USER_CERT_CACHE",
      payload: this.userCerts,
    });
    if (depth.includes("certificate")) {
      if (refresh === REFRESH_DEPTH.SHALLOW) {
        userCert.certificate = await this.getCert(userCert.certId, dispatch, REFRESH_DEPTH.NO_REFRESH, depth, clientIndex);
      } else {
        userCert.certificate = await this.getCert(userCert.certId, dispatch, refresh, depth, clientIndex);
      }
    }
    if (depth.includes("profile")) {
      if (refresh === REFRESH_DEPTH.SHALLOW) {
        try {
          userCert.toProfile = await this.getProfile(userCert.to, dispatch, REFRESH_DEPTH.NO_REFRESH, depth, clientIndex);
        } catch(err) {
          console.error(err);
        }
      } else {
        try {
          userCert.toProfile = await this.getProfile(userCert.to, dispatch, refresh, depth, clientIndex);
        } catch(err) {
          console.error(err);
        }
      }
    }
    return userCert;
  }
  async getCert(certId, dispatch, refresh, depth, clientIndex) {
    let cert;
    if (refresh === REFRESH_DEPTH.NO_REFRESH && certId in this.certificates) {
      cert = this.certificates[certId];
    } else {
      if (clientIndex) {
        cert = await this.clients[clientIndex].getCert(certId);
      } else {
        cert = await this.client.getCert(certId);
      }
    }
    this.certificates[certId] = cert;
    if (depth.includes("certificateImage")) {
      let imageUrl;
      if (refresh === REFRESH_DEPTH.SHALLOW && cert.image in this.images) {
        imageUrl = this.images[cert.image];
      } else {
        try {
          console.log(cert);
          imageUrl = await getImageOnIpfs(cert.image);
          this.images[cert.image] = imageUrl;
          dispatch({
            type: "UPDATE_IMAGE_CACHE",
            payload: this.images,
          });
        } catch(err) {
          console.error(err);
          imageUrl = "";
        }
      }
      cert.imageUrl = imageUrl;
    }
    if (depth.includes("group")) {
      let group;
      if (refresh === REFRESH_DEPTH.SHALLOW) {
        group = await this.getGroup(cert.groupId, dispatch, REFRESH_DEPTH.NO_REFRESH, clientIndex);
      } else {
        group = await this.getGroup(cert.groupId, dispatch, refresh, clientIndex);
      }
      cert.group = group;
    }
    return cert;
  }

}

module.exports = {
  GxCertCacheManager,
  REFRESH_DEPTH,
}
