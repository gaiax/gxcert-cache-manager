
const { getImageOnIpfs, createImageUrlFromUint8Array } = require("./ipfs");

function popDepth(type, depth) {
  let target = null;
  for (const d of depth) {
    if (d.type === type) {
      target = d;
      break;
    }
  }
  return {
    target,
    depth: depth.filter(d => {
      return d.type !== type;
    })
  }
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
    this.groupIdToCerts = {};
    this.groupsToBelongTo = {};
    this.certificates = {};
    this.images = {};
  }
  address() {
    return this.client.address;
  }
  setMainClient(client) {
    this.clients[0] = client;
    this.client = client;
  }
  async getProfile(address, dispatch, depth, clientIndex) {
    let profile;
    let depthResult = popDepth("profile", depth);
    const target = depthResult.target;
    depth = depthResult.depth;
    if (!target.refresh && address in this.profiles) {
      profile = this.profiles[address];
    } else {
      if (clientIndex) {
        profile = await this.clients[clientIndex].getProfile(address);
      } else {
        profile = await this.client.getProfile(address);
      }
    }
    this.profiles[address] = profile;

    depthResult = popDepth("profileImage", depth);
    if (depthResult.target) {
      if (depthResult.target.wait) {
        try {
          profile.imageUrl = await this.getImage(profile.icon, dispatch);
        } catch(err) {
          console.error(err);
        }
      } else {
        this.getImage(profile.icon, dispatch).then(imageUrl => {
          profile.imageUrl = imageUrl;
          if (depthResult.target.dispatchType) {
            dispatch({
              type: depthResult.target.dispatchType,
              payload: profile,
            });
          }
        }).catch(err => {
          console.error(err);
        });
      }
    }
    dispatch({
      type: "UPDATE_PROFILE_CACHE",
      payload: this.profiles,
    });
    return profile;
  }
  async getReceivedUserCerts(address, dispatch, depth, clientIndex) {
    let userCerts;
    let depthResult = popDepth("userCert", depth);
    const target = depthResult.target;
    depth = depthResult.depth;
    if (!target.refresh && address in this.addressToUserCerts) {
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
    if (popDepth("certificate", depth).target) {
      for (let i = 0; i < userCerts.length; i++) {
        const cert = await this.getCert(userCerts[i].certId, dispatch, depth, clientIndex, function(imageUrl) {
          const depthResult = popDepth("certificateImage", depth);
          const type = depthResult.target.dispatchType;
          if (!depthResult.target || !type) {
            return;
          }
          userCerts[i].certificate.imageUrl = imageUrl;      
          dispatch({
            type,
            payload: userCerts,
          });
        });
        userCerts[i].certificate = cert;
      }
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
  async getIssuedUserCerts(certId, dispatch, depth, clientIndex) {
    let userCerts;
    const depthResult = popDepth("userCert", depth);
    const target = depthResult.target;
    depth = depthResult.depth;
    if (!target.refresh && certId in this.certIdToUserCerts) {
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
    if (popDepth("certificate", depth).target) {
      for (let i = 0; i < userCerts.length; i++) {
        const cert = await this.getCert(userCerts[i].certId, dispatch, depth, clientIndex, function(imageUrl) {
          const depthResult = popDepth("certificateImage", depth);
          const type = depthResult.target.dispatchType;
          if (!depthResult.target || !type) {
            return;
          }
          userCerts[i].certificate.imageUrl = imageUrl;      
          dispatch({
            type,
            payload: userCerts,
          });
        });
        userCerts[i].certificate = cert;
      }
    }
    if (popDepth("profile", depth).target) {
      for (let i = 0; i < userCerts.length; i++) {
        userCerts[i].toProfile = await this.getProfile(userCerts[i].to, dispatch, depth, clientIndex);
      }
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
  async getImage(cid, dispatch) {
    if (cid in this.images) {
      return this.images[cid];
    }
    let imageUrl;
    try {
      imageUrl = await getImageOnIpfs(cid);
    } catch(err) {
      console.error(err);
      return "";
    }
    this.images[cid] = imageUrl;
    dispatch({
      type: "UPDATE_IMAGE_CACHE",
      payload: this.images,
    });
    return imageUrl;
  }
  async getGroupCerts(groupId, dispatch, depth, clientIndex) {
    let certs;
    let depthResult = popDepth("certificate", depth);
    const target = depthResult.target;
    depth = depthResult.depth;
    if (!target.refresh && groupId in this.groupIdToCerts) {
      certs = this.groupIdToCerts[groupId];
    } else {
      certs = await this.client.getGroupCerts(groupId);
      this.groupIdToCerts[groupId] = certs;
      dispatch({
        type: "UPDATE_GROUP_CERTS_CACHE",
        payload: this.groupIdToCerts,
      });
    }
    if (popDepth("userCert", depth).target) {
      for (let i = 0; i < certs.length; i++) {
        const userCerts = await this.getIssuedUserCerts(certs[i].certId, dispatch, depth, clientIndex);
        certs[i].userCerts = userCerts;
      }
    }
    depthResult = popDepth("certificateImage", depth);
    if (depthResult.target) {
      for (let i = 0; i < certs.length; i++) {
        if (depthResult.target.wait) {
          certs[i].imageUrl = await this.getImage(certs[i].image, dispatch);
        } else {
          this.getImage(certs[i].image, dispatch).then(imageUrl => {
            certs[i].imageUrl = imageUrl;
            if (depthResult.target.dispatchType) {
              dispatch({
                type: depthResult.target.dispatchType,
                payload: certs,
              });
            }
          }).catch(err => {
            console.error(err);
          });
        }
      }
    }
    return certs;
  }
  async getGroups(address, dispatch, depth, clientIndex) {
    const depthResult = popDepth("groupId", depth);
    const target = depthResult.target;
    if (!target.refresh && address in this.groupsToBelongTo) {
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
      const group = await this.getGroup(groupId, ()=>{}, depth, clientIndex);
      groups.push(group);
      this.groups[groupId] = group;
    }
    this.groupsToBelongTo[address] = groups;
    dispatch({
      type: "UPDATE_GROUPS_TO_BELONG_TO_CACHE",
      payload: this.groupsToBelongTo,
    });
    dispatch({
      type: "UPDATE_GROUP_CACHE",
      payload: this.groups,
    });
    return groups;
  }
  async getGroup(groupId, dispatch, depth, clientIndex) {
    const depthResult = popDepth("group", depth);
    const target = depthResult.target;
    depth = depthResult.depth;
    if (!target.refresh && groupId in this.groups) {
      return this.groups[groupId];
    }
    let group;
    if (clientIndex) {
      group = await this.clients[clientIndex].getGroup(groupId);
    } else {
      group = await this.client.getGroup(groupId);
    }
    this.groups[groupId] = group;
    if (popDepth("profileImage", depth).target) {
      for (let i = 0; i < group.members.length; i++) {
        group.members[i].imageUrl = await this.getImage(group.members[i].icon, dispatch);
      }
    }
    dispatch({
      type: "UPDATE_GROUP_CACHE",
      payload: this.groups,
    });
    return group;
  }
  async getUserCert(userCertId, dispatch, depth, clientIndex) {
    const depthResult = popDepth("userCert", depth);
    const target = depthResult.target;
    depth = depthResult.depth;
    let userCert;
    if (!target.refresh && userCertId in this.userCerts) {
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
    if (popDepth("certificate", depth).target) {
      userCert.certificate = await this.getCert(userCert.certId, dispatch, depth, clientIndex, function(imageUrl) {
        const depthResult = popDepth("certificateImage", depth);
        const type = depthResult.target.dispatchType;
        if (!depthResult.target || !type) {
          return;
        }
        userCert.certificate.imageUrl = imageUrl;      
        dispatch({
          type,
          payload: userCert,
        });
      });
    }
    if (popDepth("profile", depth).target) {
      try {
        userCert.toProfile = await this.getProfile(userCert.to, dispatch, depth, clientIndex);
      } catch(err) {
        console.error(err);
      }
    }
    return userCert;
  }
  async getCert(certId, dispatch, depth, clientIndex, imageCallback) {
    let depthResult = popDepth("certificate", depth);
    const target = depthResult.target;
    depth = depthResult.depth;
    let cert;
    if (!target.refresh && certId in this.certificates) {
      cert = this.certificates[certId];
    } else {
      if (clientIndex) {
        cert = await this.clients[clientIndex].getCert(certId);
      } else {
        cert = await this.client.getCert(certId);
      }
    }
    this.certificates[certId] = cert;
    depthResult = popDepth("certificateImage", depth);
    if (depthResult.target) {
      if (depthResult.target.wait) {
        cert.imageUrl = await this.getImage(cert.image, dispatch);
      } else {
        this.getImage(cert.image, dispatch).then((imageUrl) => {
          if (imageCallback) {
            imageCallback(imageUrl);
          }
        }).catch(err => {
          console.error(err);
        });
      }
    }
    if (popDepth("group", depth).target) {
      const group = await this.getGroup(cert.groupId, dispatch, depth, clientIndex);
      cert.group = group;
    }
    return cert;
  }

}

module.exports = {
  GxCertCacheManager,
}
